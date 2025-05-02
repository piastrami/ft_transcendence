import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
# classe qui contient la logique du jeu et sauvegarde l'état du jeu
from .gameStateManager import GameStateManager
from .models.game import Game 
from channels.db import database_sync_to_async
from notifications.models.GameRequestNotif import GameRequestNotif
# import logging
# logger = logging.getLogger(__name__)

class PongConsumer(AsyncWebsocketConsumer):
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.gameManager = None  # Sera initialisé lors de la connexion
        self.game_data = None # Game Model in DB 
        self.game_loop_task = None
        self.room_group_name = None # game ID
        self.user = None # username
        self.game_mode = None # practice or remote
        self.connectionMessage = None
        self.reconnection = False
        self.other_player_joined = False
        # self.players = set()
       
    async def game_loop(self):
        try:
            while self.gameManager.is_running:
            #while True:
                self.gameManager.update()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'game_update',
                        'message': self.gameManager.get_state()
                    }
                )
                await asyncio.sleep(1/60) #fps
        finally:
            self.gameManager.game_loop_running = False

    @database_sync_to_async
    def get_game_data(self, game_id):
        try:
            game = Game.objects.get(game_id=game_id)
            return game
        except Game.DoesNotExist:
            return None
    
    @database_sync_to_async
    def add_player1_to_game_data(self, game):
        return game.add_player1(self.user)

    @database_sync_to_async
    def add_player2_to_game_data(self, game):
        return game.add_player2(self.user)
    
    @database_sync_to_async
    def get_player1(self, game):
        try:
            return game.player1.user
        except:
            return None

    @database_sync_to_async
    def get_player2(self, game):
        try:
            return game.player2.user
        except:
            return None
    
    @database_sync_to_async
    def get_gameMode(self, game):
        try:
            return game.mode
        except:
            return None
    
    @database_sync_to_async
    def get_game_active(self, game):
        return game.is_active

    @database_sync_to_async
    def set_game_active(self, game):
        if game.is_active == False:    
            return game.set_game_active()
        return game
    
    async def connect(self):
        self.room_group_name = self.scope['url_route']['kwargs']['game_id']
        
        self.user = self.scope['user']
        username = self.user.username
        
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = dict(param.split("=") for param in query_string.split("&") if param)
        self.game_mode = query_params.get("mode", "practice") # Default to practice 

        if self.game_mode == "practice":
            self.gameManager = GameStateManager.get_game(self.room_group_name, self.game_mode)
            if self.gameManager and self.gameManager.is_running and self.gameManager.game_loop_running:
                self.connectionMessage = 'restart'
            else:
                self.connectionMessage = 'practice'
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'connected',
                    'message': self.connectionMessage
                }
            )
            if self.connectionMessage == 'restart' and self.gameManager and self.gameManager.player1_alias and self.gameManager.player2_alias:
                # logger.info(f"Game restarted in {self.game_mode}")
                await self.channel_layer.group_send(
                    self.room_group_name, 
                    {
                        'type': 'aliases_set',
                        'message': {
                            'player1_alias': self.gameManager.player1_alias,
                            'player2_alias': self.gameManager.player2_alias
                        }
                    }
                )
            return

            # Handle remote mode
        try:
            # Get the game manager and game data
            self.gameManager = GameStateManager.get_game(self.room_group_name, self.game_mode)
            self.game_data = await self.get_game_data(game_id=self.room_group_name)
            
            if self.game_data is None:
                raise Game.DoesNotExist
            
            # Get player information
            self.player1 = await self.get_player1(game=self.game_data)
            self.player2 = await self.get_player2(game=self.game_data)

            # Check if game is active and has started
            game_is_active = await self.get_game_active(game=self.game_data)
            if game_is_active:
                if self.player1 and self.user == self.player1:
                        self.reconnection = True
                elif self.player2 and self.user == self.player2:
                        self.reconnection = True
            
            if self.reconnection:
                self.reconnection = True
                
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )
                await self.accept()
                
                # Send reconnection message
                await self.send(text_data=json.dumps({
                    'type': 'connected',
                    'message': 'reconnection'
                }))
                
                # If game is running, start the game loop
                if self.gameManager and self.gameManager.is_running and not self.game_loop_task and not self.gameManager.game_loop_running:
                    self.game_loop_task = asyncio.create_task(self.game_loop())
                    self.gameManager.game_loop_running = True
                
                await self.channel_layer.group_send(
                    self.room_group_name, {
                        'type': 'aliases_set',
                        'message': {
                            'player1_alias': self.gameManager.player1_alias,
                            'player2_alias': self.gameManager.player2_alias,
                        }
                    }
                )

                return
            
            
            # Handle first-time connections
            if self.player1 is None:
                await self.add_player1_to_game_data(game=self.game_data)
                self.connectionMessage = 'player1'
            elif self.player1 != self.user and self.player2 is None:
                await self.add_player2_to_game_data(game=self.game_data)
                self.connectionMessage = 'player2'
            if self.player1 == self.user:
                self.connectionMessage = 'player1'
                self.gameManager.player1_alias = username
                if self.gameManager.player2_alias is not None:
                    self.other_player_joined = True
            elif self.player2 == self.user:
                self.connectionMessage = 'player2'
                self.gameManager.player2_alias = username
                if self.gameManager.player1_alias is not None:
                    self.other_player_joined = True
            else:
                # Neither player1 nor player2 - reject connection
                self.gameManager = None
                await self.close()
                return
            
        except Game.DoesNotExist:
            await self.close()
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': self.connectionMessage
        }))
        if self.other_player_joined:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'other_player_connected',
                    'message': "other player is connected",
                }
            )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'set_alias':
            alias = data.get('alias')
            side = data.get('side')
            if side == 'left':
                self.gameManager.player1_alias = alias
            elif side == 'right':
                self.gameManager.player2_alias = alias
            if self.gameManager.player1_alias and self.gameManager.player2_alias:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'aliases_set',
                        'message': {
                            'player1_alias': self.gameManager.player1_alias,
                            'player2_alias': self.gameManager.player2_alias
                        }
                    }
                )

        elif action == 'ready':
            game = self.gameManager
            if self.game_mode == "remote":
                if self.user == self.player1:
                    game.player1_ready = True
                elif self.user == self.player2:
                    game.player2_ready = True
                if (game.player1_ready and game.player2_ready):
                    await self.set_game_active(game=self.game_data)
            if (self.game_mode == "practice") or (game.player1_ready and game.player2_ready):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'game_can_start',
                        'message': "Both players ready"
                    }
                )
                game.is_running = True
                if not self.game_loop_task and self.gameManager and not self.gameManager.game_loop_running:
                    self.game_loop_task = asyncio.create_task(self.game_loop())
                    self.gameManager.game_loop_running = True

        elif action == 'move_paddle':
            side = data.get('side')
            up = data.get('up')
            if side == 'left':
                self.gameManager.move_paddle(self.gameManager.left_paddle, up)
            elif side == 'right':
                self.gameManager.move_paddle(self.gameManager.right_paddle, up)

        elif action == 'stop_game':
            self.gameManager.is_running = False
            self.gameManager.game_over = False
            if self.game_loop_task:
                self.game_loop_task.cancel()
                self.game_loop_task = None
            self.gameManager.game_loop_running = False
            if self.user == self.player1:
                self.interrupted_by = self.gameManager.player1_alias
            elif self.user == self.player2:
                self.interrupted_by = self.gameManager.player2_alias
            interrupted_data = {
                "interrupted_by_username": self.user.username,
                "interrupted_by_alias": self.interrupted_by,
            }
            GameStateManager.remove_game(self.room_group_name)
                
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'interrupted',
                    'message': interrupted_data,
                }
            )

    async def connected(self, event):
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': event['message']
        }))
    
    async def reconnection(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reconnection',
            'message': event['message']
        }))

    async def aliases_set(self, event):
        await self.send(text_data=json.dumps({
            'type': 'aliases_set',
            'message': event['message'],
        }))

    async def game_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'message': event['message']
        }))

    async def game_can_start(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_can_start',
            'message': event['message']
        }))

    async def game_exists(self):
        try:
            game = Game.objects.get(id=self.room_group_name)
            return True
        except Game.DoesNotExist:
            return False
        
    async def restart(self, event):
        await self.send(text_data=json.dumps({
            'type': 'restart',
            'message': event['message']
        }))

    async def interrupted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'interrupted',
            'message': event['message']
        }))

    async def other_player_connected(self, event):
        await self.send(text_data=json.dumps({
            'type': 'other_player_connected',
            'message': event['message']
        }))
from display import print_response, print_ws
import asyncio
import json
import threading
import time
import readchar
import websockets
import ssl
from queue import Queue

class WebSocketClient:

    def __init__(self, base_url):
        self.base_url = base_url
        self.server_url = None
        self.ws = None
        self.is_connected = False
        # thread and loop to handle asynchroneous tasks in the background
        self.asyncio_thread = None
        self.loop = None
        self.message_queue = Queue(maxsize=100)
        self.game_active = False
        self.should_exit = False
        # event to signal when the asyncio loop is ready
        self.asyncio_ready = threading.Event()
        # task to receive messages from the server
        self.receiver_task = None
        # storing some api infos of the client: 
        self.api_base_url = None
        self.game_id = None
        self.player1 = None
        self.player2 = None
        self.game_over = False

    def start_asyncio_thread(self):
        """Démarrer un thread dédié pour la boucle asyncio."""
        if self.asyncio_thread is not None:
            return
        
        self.asyncio_thread = threading.Thread(target=self._run_asyncio_loop)
        self.asyncio_thread.daemon = True
        self.asyncio_thread.start()
        
        # Attendre que la boucle asyncio soit prête
        self.asyncio_ready.wait()

    def _run_asyncio_loop(self):
        """Fonction exécutée dans le thread asyncio."""
        # Créer une nouvelle boucle d'événements pour ce thread
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        # Signaler que la boucle est prête
        self.asyncio_ready.set()
        
        # Exécuter la boucle jusqu'à ce qu'elle soit arrêtée
        self.loop.run_forever()

    def connect(self):
        """Établir la connexion WebSocket avec le serveur."""
        if self.is_connected:
            print("Déjà connecté au serveur.")
            return True

        # S'assurer que le thread asyncio est démarré
        self.start_asyncio_thread()
        
        # Utiliser un futur pour récupérer le résultat de la connexion
        connect_future = asyncio.run_coroutine_threadsafe(
            self._connect_async(), self.loop
        )
        
        try:
            # Attendre le résultat avec un timeout
            result = connect_future.result(timeout=5)
            return result
        except asyncio.TimeoutError:
            print("Timeout lors de la connexion au serveur.")
            return False
        except Exception as e:
            print(f"Erreur lors de la connexion: {e}")
            return False

    async def _connect_async(self):
        """Coroutine pour établir la connexion WebSocket."""
        try:
            # Établir la connexion WebSocket

            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            self.ws = await websockets.connect(self.server_url, ssl=ssl_context)
            self.is_connected = True
            print_ws(f"ws connection established to server at url: {self.server_url} ✅")
            
            # Démarrer la tâche de réception des messages
            self.receiver_task = asyncio.create_task(self._message_receiver())

            return True
        except Exception as e:
            print(f"Erreur lors de la connexion: {e}")
            self.is_connected = False
            return False

    async def _message_receiver(self):
        """Coroutine pour recevoir les messages du serveur."""
        try:
            i = 0
            while self.is_connected and self.ws is not None:
                try:
                    message = await self.ws.recv()
                    # to catch the start_message server response (which is the second message)
                    if i == 1:
                        print_response(message)
                    i += 1
                    try:
                        data = json.loads(message)
                        # Ajouter le message à la queue, supprimant le plus ancien si pleine
                        if self.message_queue.full():
                            self.message_queue.get()
                        self.message_queue.put(data)
                    except json.JSONDecodeError:
                        print(f"Message non-JSON reçu: {message}")
                except websockets.exceptions.ConnectionClosed:
                    print_ws("disconnecting websocket...")
                    self.is_connected = False
                    break
        except Exception as e:
            print(f"Erreur dans le récepteur de messages: {e}")
            self.is_connected = False

    def disconnect(self):
        """Fermer la connexion WebSocket."""
        if not self.is_connected:
            print("Pas de connexion active.")
            return
        
        disconnect_future = asyncio.run_coroutine_threadsafe(
            self._disconnect_async(), self.loop
        )
        
        try:
            disconnect_future.result(timeout=5)
        except Exception as e:
            print(f"Erreur lors de la déconnexion: {e}")

    async def _disconnect_async(self):
        """Coroutine pour fermer la connexion WebSocket."""
        if self.ws is not None:
            await self.ws.close()
            self.ws = None
        
        self.is_connected = False
        print_ws("websocket disconnected ✅")

    # set le game id ###################################################
    def set_game_id(self, game_id):
        """Définir l'ID du jeu et mettre à jour l'URL du serveur."""
        if self.is_connected:
            # Si déjà connecté, déconnecter d'abord
            self.disconnect()
            
        self.game_id = game_id
        self.server_url = f"{self.base_url}/{self.game_id}/?mode=practice"
        # self.server_url = f"{self.base_url}/{self.game_id}/?mode=remote"
        return True

   # start le game #####################################################
    def start_game(self):
        """Envoyer une commande pour démarrer le jeu."""
        if not self.is_connected:
            print("Non connecté au serveur.")
            return False
        
        start_future = asyncio.run_coroutine_threadsafe(
            self._start_game_async(), self.loop
        )
        
        try:
            result = start_future.result(timeout=5)
            if result:
                self.game_active = True
            return result
        except Exception as e:
            print(f"Erreur lors du démarrage du jeu: {e}")
            return False

    async def _start_game_async(self):
        """Coroutine pour envoyer la commande de démarrage du jeu."""
        try:
            
            message1 = {'action': 'ready', 'side': 'left'}
            message2 = {'action': 'ready', 'side': 'right'}
            
            print(f"sending messages: {message1}, {message2} to websocket server at entrypoint: {self.server_url}")
            
            await self.ws.send(json.dumps(message1))
            await self.ws.send(json.dumps(message2))
            
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de la commande: {e}")
            return False
    
    #####################################################################

    def get_latest_message(self):
        """Récupérer le dernier message reçu sans bloquer."""
        if self.message_queue.empty():
            return None
        
        # Vider la queue et ne garder que le dernier message
        last_message = None
        while not self.message_queue.empty():
            last_message = self.message_queue.get()
        
        return last_message

    def send_paddle_move(self, side, up):
        """Envoyer une commande pour déplacer une raquette.
        
        Args:
            side (str): Le côté de la raquette ('left' ou 'right')
            up (bool): True pour monter, False pour descendre
        
        Returns:
            bool: True si la commande a été envoyée avec succès, False sinon
        """
        if not self.is_connected:
            print("Non connecté au serveur.")
            return False
        
        move_future = asyncio.run_coroutine_threadsafe(
            self._send_paddle_move_async(side, up), self.loop
        )
        
        try:
            result = move_future.result(timeout=1)  # Timeout court pour éviter de bloquer
            return result
        except Exception as e:
            print(f"Erreur lors de l'envoi de la commande de mouvement: {e}")
            return False

    async def _send_paddle_move_async(self, side, up):
        """Coroutine pour envoyer la commande de mouvement de raquette.
        
        Args:
            side (str): Le côté de la raquette ('left' ou 'right')
            up (bool): True pour monter, False pour descendre
        
        Returns:
            bool: True si la commande a été envoyée avec succès, False sinon
        """
        try:
            message = {
                "action": "move_paddle",
                "side": side,
                "up": up
            }

            print(f"\nsending message: {message} to websocket server at entrypoint: {self.server_url}")
            
            await self.ws.send(json.dumps(message))
            return True
        except Exception as e:
            print(f"Erreur lors de l'envoi de la commande de mouvement: {e}")
            return False

    # called before exiting the program ################################
    def cleanup(self):
        """Nettoyer les ressources avant de quitter."""
        # Déconnecter si nécessaire
        if self.is_connected:
            self.disconnect()
        
        # Arrêter la boucle asyncio si elle existe
        if self.loop is not None:
            asyncio.run_coroutine_threadsafe(
                self._stop_loop(), self.loop
            )
            
            # Attendre un peu que la boucle se termine
            time.sleep(0.5)
    #####################################################################

    async def _stop_loop(self):
        """Coroutine pour arrêter proprement la boucle asyncio."""
        # Annuler toutes les tâches en cours
        tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
        for task in tasks:
            task.cancel()
        
        # Attendre que toutes les tâches soient annulées
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Arrêter la boucle
        self.loop.stop()

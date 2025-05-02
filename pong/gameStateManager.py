import random

# import logging
# logger = logging.getLogger(__name__)

class GameStateManager:
    _active_games = {}
            
    def __init__(self, game_id):
        self.is_running = False
        self.game_loop_running = False
        self.ball = {'x': 400, 'y': 300, 'dx': 3, 'dy': 3, 'radius': 10}
        self.left_paddle = {'x': 0, 'y': 250, 'width': 10, 'height': 100}
        self.right_paddle = {'x': 790, 'y': 250, 'width': 10, 'height': 100}
        self.width = 800
        self.height = 600
        self.score = {'left': 0, 'right': 0}
        self.game_over = False
        self.game_id = game_id
        self.reset_ball()
        self.player1_ready = False
        self.player2_ready = False
        self.player1_alias = None
        self.player2_alias = None

    # Returns a new instance of GameStateManager if it doesn't exist.
    # This is so that one game is rendered by one manager to multiple clients
    @classmethod
    def get_game(cls, game_id, game_type=None):
        # logger.info(f"All active games: {cls._active_games}")
        # logger.info(f"Game type in GS Manager: {game_type}")
        if game_id not in cls._active_games:
            # logger.info(f"Creating new GameStateManager for {game_id}")
            cls._active_games[game_id] = cls(game_id)
        # else:
            # logger.info(f"GameStateManager already exists for {game_id}")
        return cls._active_games[game_id]
    
    #Remove game once game is over so ID can be reused 
    @classmethod
    def remove_game(cls, game_id):
        if game_id in cls._active_games:
            del cls._active_games[game_id]

    def update(self):
        # Mettre à jour la balle
        ball = self.ball
        ball['x'] += ball['dx']
        ball['y'] += ball['dy']

        # calculer les scores
        if ball['x'] < 0:
            self.score['right'] += 1
            self.reset_ball()
        elif ball['x'] > self.width:
            self.score['left'] += 1
            self.reset_ball()
        
        if self.score['left'] == 5 or self.score['right'] == 5:
            self.is_running = False
            self.game_over = True

        # Rebondir sur les murs
        if ball['y'] - ball['radius'] < 0 or ball['y'] + ball['radius'] > self.height:
            ball['dy'] *= -1

        # Gérer les collisions avec les paddles
        self.check_collision(self.left_paddle)
        self.check_collision(self.right_paddle)    

    def check_collision(self, paddle):
        ball = self.ball

        # Vérifier la collision
        if (paddle['x'] - ball['radius'] < ball['x'] < paddle['x'] + paddle['width'] + ball['radius'] and
        paddle['y'] - ball['radius'] < ball['y'] < paddle['y'] + paddle['height'] + ball['radius']):
            ball['dx'] *= -1.1
            # mettre -1 si on ne veut pas que la balle accélère à chaque rebond

            # pour eviter le bug de la balle qui reste coincée dans le paddle
            if ball['dx'] > 0:  
                ball['x'] = paddle['x'] + paddle['width'] + ball['radius']
            else: 
                ball['x'] = paddle['x'] - ball['radius']

    def move_paddle(self, paddle, up):
        speed = 40
        if up:
            paddle['y'] -= speed
        else:
            paddle['y'] += speed

        paddle['y'] = max(0, min(self.height - paddle['height'], paddle['y']))
   

    def reset_ball(self):
        self.ball['x'] = self.width / 2
        self.ball['y'] = self.height / 2

        # Choisir une direction aléatoire pour dx (-5 ou 5)
        self.ball['dx'] = random.choice([-5, 5])

        # Ajouter un dy aléatoire pour varier la trajectoire verticale
        self.ball['dy'] = random.uniform(-4, 4)  # dy sera un nombre aléatoire entre -4 et 4

        # Assurer que dy n'est pas trop petit pour éviter un mouvement trop horizontal
        if abs(self.ball['dy']) < 1:
            self.ball['dy'] = 1 if self.ball['dy'] > 0 else -1

    def get_state(self):
        return {
            'ball': self.ball,
            'left_paddle': self.left_paddle,
            'right_paddle': self.right_paddle,
            'score': self.score,
            'is_running': self.is_running,
            'game_over': self.game_over,
            'player1_alias': self.player1_alias,
            'player2_alias': self.player2_alias,
        }


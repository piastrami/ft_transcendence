from display import print_err

def display_RT_state(client, state):
    if state is None:
        return
    try:
        ball = state.get('ball', {})
        left_paddle = state.get('left_paddle', {})
        right_paddle = state.get('right_paddle', {})
        score = state.get('score', {})
        score_left = score.get('left', 0)
        score_right = score.get('right', 0)
        
        # Dimensions du terrain original: 800x600
        # Dimensions réduites pour le terminal: 40x15 (plus petit)
        term_width = 40
        term_height = 15
        scale_x = 800 / term_width
        scale_y = 600 / term_height
        
        # Positions mises à l'échelle
        ball_term_x = int(ball.get('x', 0) / scale_x)
        ball_term_y = int(ball.get('y', 0) / scale_y)
        left_term_y = int(left_paddle.get('y', 0) / scale_y)
        left_term_height = max(1, int(left_paddle.get('height', 0) / scale_y))
        right_term_y = int(right_paddle.get('y', 0) / scale_y)
        right_term_height = max(1, int(right_paddle.get('height', 0) / scale_y))
        
        # Afficher le score en haut
        print(f" \tScore: {client.player1}[{score_left}] - {client.player2}[{score_right}]")
        # P2 [{score_right}]")
        print("+" + "-" * (term_width - 2) + "+")
        
        # Construire et afficher chaque ligne du terrain
        for y in range(term_height):
            line = "|"
            for x in range(term_width - 2):
                # Centre du terrain
                if x == (term_width - 2) // 2:
                    line += "·"
                # Balle
                elif x == ball_term_x and y == ball_term_y:
                    line += "O"
                # Raquette gauche
                elif x == 0 and y >= left_term_y and y < left_term_y + left_term_height:
                    line += "█"
                # Raquette droite
                elif x == term_width - 3 and y >= right_term_y and y < right_term_y + right_term_height:
                    line += "█"
                # Espace vide
                else:
                    line += " "
            line += "|"
            print(line)
        
        # Bordure inférieure
        print("+" + "-" * (term_width - 2) + "+")
        
    except Exception as e:
        print_err(f"Error displaying game state: {e}")
        print(f"State data: {state}")
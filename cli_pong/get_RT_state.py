from display import print_err, print_response
from display_RT_state import display_RT_state
import requests
import json

def update_score_game(client, p1_score, p2_score):
    
    print("🔄 updating the game inside db...")

    endpoint = f"{client.api_base_url}/pong/game_session/update/{client.game_id}/"
    print(f'PUT request to the endpoint: {endpoint}')
    response = requests.put(
        f"{endpoint}",
        json={"game_id": client.game_id, "mode": "1vs1", "player1_score": p1_score, "player2_score": p2_score, 'is_active': False},
        verify=False
    )
    print_response(response.json())


def verify_game_over(client, state):

    score = state.get('score', {})
    score_left = score.get('left', 0)
    score_right = score.get('right', 0)

    if score_left >= 5 or score_right >= 5:
        client.game_active = False
        client.game_over = True
        winner = client.player1 if score_left >= 5 else client.player2
        #  print
        print(f"+=============== GAME OVER =============+")
        print(f"|\t{client.player1}[{score_left}] - {client.player2}[{score_right}]\t\t|")
        print(f"|\t{winner} is the winner !\t\t|")
        print("+=======================================+")
        # update db
        update_score_game(client, score_left, score_right)
        return True
    else:
        return False


def get_RT_state(client):

    print("\n🌐 displaying real-time game state...")

    if client.game_id is None:
        print_err("you need to create a game first")
        return
    if not client.game_active and not client.game_over:
        print_err("game needs to be started first")
        return
    if client.game_over:
        print_err("game is over, you need to create a new game")
        return
    
    msg = client.get_latest_message()
    print_response(msg)

    if msg is None:
        # print_err("no message received")
        return

    # verify if game is over
    state = msg.get('message', {})
    game_over = verify_game_over(client, state)
    
    if not game_over:
        display_RT_state(client, state)
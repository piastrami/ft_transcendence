from display import print_err, print_response
from datetime import datetime
import requests
import json
import os

def user_friendly_display(state):

    print("+ ------------- 📊 ------------ +")
    print(f"| game id: \t{state['game_id']}\t|")
    if state['player1']:
        print(f"| player 1: \t{state['player1']['user']['username']}\t\t|")
    else :
        print("| player 1: \tNone\t\t|")
    if state['player2']:
        print(f"| player 2: \t{state['player2']['user']['username']}\t\t|")
    else:
        print("| player 2: \tNone\t\t|")
    print(f"| score: \t{state['player1_score']} - {state['player2_score']}\t\t|")
    if state['winner']:
        print(f"| winner: \t{state['winner']['user']['username']}\t\t|")
    else:
        print("| winner: \tNone\t\t|")
    print(f"| is_active: \t{state['is_active']}\t\t|")
    date_str = state['date']
    created_at_date = datetime.fromisoformat(date_str)
    formatted_date = created_at_date.strftime("%d-%m-%Y")
    formatted_time = created_at_date.strftime("%-I:%M%p")
    print(f"| created at:\t{formatted_date}\t|\n|\t\t{formatted_time}\t\t|")
    print("+ ----------------------------- +")


def display_game(client):

    print("\n👾 displaying the state of the game inside db...")
    if client.game_id is None:
        print_err("you need to create a game first")
        return
    if client.is_connected and client.game_active:
        print_err("\ngame state is currently handled by the real-time websocket server, note that scores are not up to date, press 'g' to get the latest state")
        print("\n")
        # return

    endpoint = f"{client.api_base_url}/pong/game_session/{client.game_id}/"

    print(f'GET request to the endpoint: {endpoint}')

    response = requests.get(
        f"{endpoint}", 
        json={"game_id": client.game_id, "mode": "remote"},
        verify=False
    )

    print_response(response.json())
    user_friendly_display(response.json())
    
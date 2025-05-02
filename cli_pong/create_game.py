from check_db_state_game import check_db_state_game
from display import print_response, print_err
from register_players import register_players
# from cli import check_db_state_game
import readchar
import requests
import json
import os

def get_unique_game_id(client):

    endpoint = f"{client.api_base_url}/pong/generate_id/"
    print(f'GET request to the endpoint: {endpoint}')
    response = requests.get(f'{endpoint}', verify=False)
    print_response(response.json())
    
    if response.status_code == 200:
        return response.json()['game_id']
    else:
        raise Exception(f"Error in create_game.py / get_unique_game_id: {response.status_code}")

def create_game(client):

    print("\n🥚 creating a new game...")
    
    # ask user if previous game should be lost
    if client.game_id and not client.game_over:
        print_err("you are about to create a new game, the current game will be lost")
        print_err("do you want to continue? (y/n)")
        key = readchar.readkey()
        if key == 'n':
            check_db_state_game(client)
            return

    game_id = get_unique_game_id(client) 

    endpoint = f"{client.api_base_url}/pong/game_session/{game_id}/"
    print(f'POST request to the endpoint: {endpoint}')
    response = requests.post(
        f"{endpoint}", 
        json={"game_id": game_id, "mode": "remote"},
        verify=False
    )
    print_response(response.json())

    # new websocket connection
    client.set_game_id(game_id)
    client.game_active = False
    client.game_over = False
    client.connect()

    # register players
    print_err("we use a middleware to safely set the users with their JWT in the webbrowser version, here in the terminal we need to set the players manually:")
    register_players(client)
from display import print_err, print_response
import requests
import asyncio
import json
import os

def start_game(client):
    
    print("\n▶️  starting the game...")
    if client.game_id is None:
        print_err("you need to create a game first")
        return
    elif client.game_active:
        print_err("game has already started")
        return
    elif client.game_over:
        print_err("game is over, you need to create a new game")
        return
    client.start_game()

    endpoint = f"{client.api_base_url}/pong/game/update/status/{client.game_id}/"
    print(f'POST request to the endpoint: {endpoint}')
    response = requests.post(
        endpoint, 
        json={"game_id": client.game_id,  "is_active": True},
        verify=False
    )
    print_response(response.json())
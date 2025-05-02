from display import print_err, print_response
import requests
import json
import os

username1 = None

def check_username(client, nb):
    
    global username1

    while True:
        username = input(f"enter player{nb}\'s username: ").strip()
        if nb == 1:
            username1 = username
        elif nb == 2 and username == username1:
            print_err("player1 and player2 cannot be the same")
            continue
        if len(username) < 1:
            print_err("username is required")
        else:
            endpoint = f"{client.api_base_url}/profiles/check/{username}/"
            print(f'GET request to the endpoint: {endpoint}')
            response = requests.get(endpoint, verify=False)
            print_response(f"{response.json()}")
            data = response.json()
            if data.get('exists', True):
                if nb == 1:
                    client.player1 = username
                elif nb == 2:
                    client.player2 = username
                return response.json()['id']
            else:
                print_err("username not found, please try again")
                continue


def register_players(client):
    
    print("🪪 registering players...")

    player1 = check_username(client, 1)
    player2 = check_username(client, 2)

    endpoint = f"{client.api_base_url}/pong/game/update/players/{client.game_id}/"
    print(f'PATCH request to the endpoint: {endpoint}')
    response = requests.patch(f'{endpoint}', data=json.dumps({'player1_id': player1, 'player2_id': player2}), headers={'Content-Type': 'application/json'}, verify=False)
    print_response(f"{response.json()}")
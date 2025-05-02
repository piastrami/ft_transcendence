
import requests
# had to make a seperate file for this because of circular import error
def check_db_state_game(client):

    if client.game_id is None:
        return
    elif client.player1 is None or client.player2 is None:
        # erase game from db if players are not registered
        endpoint = f"{client.api_base_url}/pong/game_session/{client.game_id}/"
        response = requests.delete(endpoint, verify=False)
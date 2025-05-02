from display import print_response, print_err
import requests
import json

def list_games(data):
    print("id\t\tmode\tdate\t\t\tscore\tp1\tp2\tstatus\twinner")
    print("-" * 100)
    
    for game in data:
        game_id = game['game_id']
        mode = game['mode']
        datetime_parts = game['date'].split('T')
        date = datetime_parts[0]
        time_with_timezone = datetime_parts[1]
        time = time_with_timezone.split('+')[0] 
        time = time[:8]
        score = f"{game['player1_score']} - {game['player2_score']}"
        player1 = game['player1']['user']['username']
        player2 = game['player2']['user']['username']
        status = 'Active' if game['is_active'] else 'Inactive'
        winner = game['winner'] if game['winner'] else 'None'
        
        print(f"{game_id}\t{mode}\t{date}-{time}\t{score}\t{player1}\t{player2}\t{status}\t{winner}")


def get_active_games(client):
    
    print("\n🏁 listing all active games...")
    print_err("note that scores are not up to date here inside db as they are handled in real-time by the websocket server till the end of the game.")
    endpoint = f"{client.api_base_url}/pong/games/active/"
    print(f'GET request to the endpoint: {endpoint}')
    
    response = requests.get(endpoint, verify=False)
    data = response.json()
    
    print_response(data)
    game_list = data.get('active_games')
    list_games(game_list)

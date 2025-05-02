# local imports
from display import display_menu, clear_terminal, print_err
from check_db_state_game import check_db_state_game
from get_active_games import get_active_games
from register_players import register_players
from WebSocketClient import WebSocketClient
from get_RT_state import get_RT_state
from display_game import display_game
from move_paddles import move_paddles
from create_game import create_game
from start_game import start_game
# libraries
import readchar
import asyncio
import urllib3
import signal
import sys
import os


def keyboard_listener(client):

    while not client.should_exit:
        
        key = readchar.readchar()
        if key == 'c':
            create_game(client)
        elif key == 'd':
            display_game(client)
        elif key == 's':
            start_game(client)
        elif key == 'g':
            get_RT_state(client)
        elif key == 'm':
            move_paddles(client)
        elif key == 'l':
            get_active_games(client)
        elif key == 'o':
            clear_terminal()
            display_menu()
        elif key == 'x':
            break

def main():

    # setting up the websocket client
    host = os.environ.get('HOST_IP')
    if not host:
        print_err("HOST_IP is not set in environment")
    base_url = f"wss://{host}:8001/ws/pong"
    client = WebSocketClient(base_url)
    client.api_base_url = f"https://{host}:8000"

    # printing menu
    clear_terminal()
    display_menu()

    try:
        keyboard_listener(client) #main loop
    except KeyboardInterrupt: # stops the program when Ctrl+C is pressed
        pass
    finally:
        check_db_state_game(client)
        client.cleanup()
        # clear_terminal()
        print_err("bye!")

if __name__ == "__main__":
   
    # suppress the warning for self-signed SSL certificate
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    main()
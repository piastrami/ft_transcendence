from display import display_menu, clear_terminal, print_err
import readchar

def move_paddles(client):

    print("\n🕹️  moving paddles...")

    if not client.game_id:
        print_err("you need to create a game first")
        return
    if not client.game_active and not client.game_over:
        print_err("you need to start the game first")
        return
    if client.game_over:
        print_err("game is over, you need to create a new game")
        return

    # write instructions
    print("for left player:\t\t\tfor right player:")
    print("press 'w' to move up \t\t\tpress '🔼' to move up")
    print("press 's' to move down\t\t\tpress '🔽' to move down")

    key = readchar.readkey()

    if key == readchar.key.UP:
        client.send_paddle_move("right", True)
    elif key == readchar.key.DOWN:
        client.send_paddle_move("right", False)
    elif key == 'w':
        client.send_paddle_move("left", True)
    elif key == 's':
        client.send_paddle_move("left", False)
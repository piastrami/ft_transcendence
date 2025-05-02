import os

###### colors
def rgb_to_ansi(r, g, b):
    return f"\033[38;2;{r};{g};{b}m"
# error
BLK = rgb_to_ansi(0, 0, 0)
WBG = "\033[47m"
BLD = "\033[1m"
ERR = BLK + WBG + BLD
def print_err(str):
    print(ERR + str + RST)
# json responses
GRY = rgb_to_ansi(150, 150, 150)
RST = "\033[0m"
def print_response(response):
    print(f'{GRY}response : {response}{RST}')
# webosket messages
BLU = rgb_to_ansi(89, 173, 246)
def print_ws(str):
    print(f'{BLU}{str}{RST}')
#############


def clear_terminal():
    os.system('cls' if os.name == 'nt' else 'clear')


def display_menu():

    print("\n\t-----------------------------------------------------------------------------------------\n")
    print("\t\t\t\t👾 welcome to SKYDJANGJAO api-cli pong! 👾\n")
    print("\tthis is a demo of a partial usage of our game api via the command-line interface.\n")
    print("\t💾 db features:\t\t\t\t\t⏱️  real-time features:")
    print("\tpress 'c' to create a pong game\t\t\tpress 's' to start the game")
    print("\tpress 'd' to display the db state of a game\tpress 'm' to move paddles")
    print("\tpress 'l' to get a list of all running games\tpress 'g' to get the real-time game state\n")
    print("\t\t\t\t\t🌊 navigation:")
    print("\t\t\tpress 'o' if you want to clean this terminal")
    print("\t\t\t\t\tpress 'x' to exit")
    print("\n\t-----------------------------------------------------------------------------------------\n")
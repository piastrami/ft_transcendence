#!/bin/bash

# Define colors using tput
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
BLUE=$(tput setaf 4)
CYAN=$(tput setaf 6)
BOLD=$(tput bold)
RESET=$(tput sgr0)

# Function to display usage information
show_usage() {
    echo -e "${BOLD}${CYAN}Usage: $0 <tournament_status>${RESET}"
    echo ""
    echo -e "${BOLD}Where tournament_status can be one of:${RESET}"
    echo -e "${CYAN}  waiting     ${RESET}- A tournament is created. 3 notifications are created, with player 1 as the"
    echo "                sender and players 2, 3 and 4 as recipients. All the notifications are"
    echo "                pending. All players are yet to join the tournament, including player 1. ${BOLD}Submit aliases page expected.${RESET}"
    echo -e "${CYAN}  check_notification     ${RESET}- Same as waiting, but we navigate to profile page instead of tournament page.${BOLD}Notification in navbar expected.${RESET}"
    echo ""
    echo -e "${CYAN}  semi_finals ${RESET}- A tournament is created. 4 players have joined. Semifinal matches are"
    echo "                created, and chat rooms created.${BOLD}Semifinals page expected${RESET} with appropriate Join Your Match button."
    echo ""
    echo -e "${CYAN}  finals      ${RESET}- A tournament is created, 4 players joined. Semi finals have been completed"
    echo "                and scores updated. The final has been created with winners of the semi"
    echo "                final. It is waiting to be played.${BOLD}Finals page expected${RESET} with appropriate Join Your Match button."
    echo ""
    echo -e "${CYAN}  completed   ${RESET}- A tournament is created, 4 players joined. All matches have been completed"
    echo "                and a winner has been determined. Tournament status is set to completed. ${BOLD}Completed page expected${RESET} with celebration gif."
}

echo -e "${BLUE}Number of arguments: ${RESET}$#"
echo -e "${BLUE}All arguments: ${RESET}$@"

# Iterating through all arguments
echo -e "${BLUE}Listing all arguments:${RESET}"
for arg in "$@"; do
    echo -e "- $arg"
done

# Check if exactly one argument is provided
if [ $# -ne 1 ]; then
    echo -e "${RED}${BOLD}Error: Exactly one argument required${RESET}"
    show_usage
    exit 1
fi

# Store the tournament status argument
TOURNAMENT_STATUS="$1"
HOST_IP=$(ip addr show | grep -w 'inet' | grep -v '127.0.0.1' | grep -v 'docker' | grep -v 'virtual' | head -n 1 | awk '{print $2}' | cut -d'/' -f1)

echo -e "${BLUE}Detected host IP: ${RESET}$HOST_IP"
echo -e "${BLUE}Tournament status: ${RESET}$TOURNAMENT_STATUS"

# Validate tournament status
case "$TOURNAMENT_STATUS" in
    waiting|check_notification|semi_finals|finals|completed)
        echo -e "${GREEN}Creating tournament with status: ${BOLD}$TOURNAMENT_STATUS${RESET}"
        ;;
    *)
        echo -e "${RED}${BOLD}Error: Invalid tournament status '$TOURNAMENT_STATUS'${RESET}"
        show_usage
        exit 1
        ;;
esac

# Install required Python packages for Selenium
echo -e "${BLUE}${BOLD}Installing required Python packages...${RESET}"
pip install selenium webdriver-manager psutil

# Create a Python script for creating the tournament based on the selected status
echo -e "${BLUE}${BOLD}Generating tournament creation script...${RESET}"
cat > create_tournament.py << EOF
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ft_transcendence.settings")
django.setup()

from django.utils import timezone
from profiles.models.UserProfile import UserProfile
from pong.models.tournament import Tournament, TournamentPlayer, TournamentStatus, TournamentGame
from pong.models.game import Game
from notifications.models.GameRequestNotif import GameRequestNotif
import uuid

def create_tournament_with_status(status):
    # Get 4 users for the tournament
    pia = UserProfile.objects.get(user__username='pia')
    felise = UserProfile.objects.get(user__username='felise')
    romina = UserProfile.objects.get(user__username='romina')
    buse = UserProfile.objects.get(user__username='buse')
        
    users = [pia, felise, romina, buse]
    
    if len(users) < 4:
        print("Error: Need at least 4 users in the database", file=sys.stderr)
        return None
    
    # Create tournament with a unique ID
    tournament_id = f"{str(uuid.uuid4())[:8]}"
    print (f"Creating tournament with ID: {tournament_id}")
    
    # Create tournament 
    try:
        tournament = Tournament.objects.create(
            tournament_id=tournament_id,
            creator=users[0],
        )

        # Add only the creator to the tournament
        TournamentPlayer.objects.create(
            tournament=tournament,
            user_profile=users[0],
            alias="Player 1"
        )

        if status == "waiting" or status == "check_notification":
            # Create notifications for other players
            for i, user in enumerate(users[1:4], 2):
                GameRequestNotif.objects.create(
                    inviter=users[0].user,
                    recipient=user.user,
                    game_type="tournament",
                    game_id=tournament_id,
                    message=f"{users[0].user.username} is inviting you to join tournament {tournament_id}",
                )
            print (tournament_id)
            return tournament_id
            
        # Add all players to tournament
        for i, user in enumerate(users[1:4], 1):
            TournamentPlayer.objects.create(
                tournament=tournament,
                user_profile=user,
                alias=f"Player {i+1}"
            )
        
        # Start the tournament to create semifinal matches
        tournament.start_tournament()

        if status == "semi_finals":
            print (tournament_id)
            return tournament_id
        
        semifinal1 = tournament.tournament_games.filter(round="semifinal", order=1).first()
        semifinal2 = tournament.tournament_games.filter(round="semifinal", order=2).first()
        print (f"Semifinal matches: {semifinal1}, {semifinal2}")
        # Set semifinal matches as completed with scores
        semifinal1.game.update_game(
            player1_score=5,
            player2_score=3,
            is_active=False
        )
        
        semifinal2.game.update_game(
            player1_score=2,
            player2_score=5,
            is_active=False
        )
        
        tournament.create_final_game()

        if status == "finals":
            print (tournament_id)
            return tournament_id
              
        # Set final match as completed with scores
        final_game = tournament.tournament_games.filter(round="final").first()
        final_game.game.update_game(
            player1_score=5,
            player2_score=1,
            is_active=False
        )
        tournament.complete_tournament()

    except Exception as e:
        print(f"Error: str{e}", file=sys.stderr)
        return None
    
    # Print just the tournament ID so it can be captured by the shell script
    print(tournament_id)
    return tournament_id

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python create_tournament.py <tournament_status>")
        sys.exit(1)
    status = sys.argv[1]
    create_tournament_with_status(status)
EOF

# Copy the script to the Django container
echo -e "${BLUE}${BOLD}Copying tournament creation script to Django container...${RESET}"
docker cp create_tournament.py django:/app/create_tournament.py

# Execute the script in the Django container
echo -e "${BLUE}${BOLD}Creating tournament in ${YELLOW}$TOURNAMENT_STATUS${BLUE} stage...${RESET}"
TOURNAMENT_ID=$(docker exec -i django python create_tournament.py $TOURNAMENT_STATUS | tail -1)

# Clean up the temporary script
rm create_tournament.py
docker exec django rm /app/create_tournament.py 2>/dev/null || true

echo -e "${GREEN}${BOLD}Tournament created with ID: ${YELLOW}$TOURNAMENT_ID${RESET}"

# Define Chrome path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v google-chrome &> /dev/null; then
        CHROME_PATH="google-chrome"
    elif command -v chromium-browser &> /dev/null; then
        CHROME_PATH="chromium-browser"
    else
        echo -e "${RED}${BOLD}Error: Chrome or Chromium not found. Please install it.${RESET}"
        exit 1
    fi
else
    # Windows or other
    echo -e "${RED}${BOLD}Error: Unsupported OS. Please modify the script to use your Chrome path.${RESET}"
    exit 1
fi

# Accept certificates on port 8001 in headless mode
echo -e "${BLUE}${BOLD}Accepting certificate on port 8001 in headless mode...${RESET}"
"$CHROME_PATH" --headless --disable-gpu --ignore-certificate-errors \
--no-sandbox --disable-web-security "https://$HOST_IP:8001" &

CHROME_HEADLESS_PID=$!
sleep 5
kill $CHROME_HEADLESS_PID 2>/dev/null
wait $CHROME_HEADLESS_PID 2>/dev/null

# Accept certificates on port 8000 in headless mode
echo -e "${BLUE}${BOLD}Accepting certificate on port 8000 in headless mode...${RESET}"
"$CHROME_PATH" --headless --disable-gpu --ignore-certificate-errors \
--no-sandbox --disable-web-security "https://$HOST_IP:8000/signin" &

CHROME_HEADLESS_PID=$!
sleep 5
kill $CHROME_HEADLESS_PID 2>/dev/null
wait $CHROME_HEADLESS_PID 2>/dev/null

# Run the multi-login script
echo -e "${BLUE}${BOLD}Opening Chrome windows and attempting automatic login for all users...${RESET}"
python multiple_logins.py "$HOST_IP" "$TOURNAMENT_ID" "$TOURNAMENT_STATUS"

echo -e "${GREEN}${BOLD}Done! Chrome windows should be opening with automatic login in progress.${RESET}"
exit 0
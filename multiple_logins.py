import subprocess
import time
import sys
import os
import re
import threading
import atexit
import signal
import psutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.common.keys import Keys

if len(sys.argv) < 2:
    print("Usage: python multiple_logins.py [host_ip] [tournament_id] [tournament_status]")
    sys.exit(1)
host_ip = sys.argv[1]
if len(sys.argv) > 2:
    tournament_id = sys.argv[2]
else:
    tournament_id = None
if len(sys.argv) > 3:
    tournament_status = sys.argv[3]
else:
    tournament_status = None

users = [
    {"username": "pia", "password": "piapong"},
    {"username": "felise", "password": "felisepong"},
    {"username": "romina", "password": "rominapong"},
    {"username": "buse", "password": "busepong"},
]

TABS_PER_WINDOW = [2, 3]  # 2 tabs in first window, 3 tabs in second window

class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def close_existing_chrome_windows():
    print(f"{Colors.YELLOW}Closing any existing Chrome windows...{Colors.RESET}")
    chrome_closed = 0
    
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            if 'chrome' in proc.info['name'].lower():
                print(f"Terminating Chrome process with PID {proc.info['pid']}")
                proc.terminate()
                chrome_closed += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    time.sleep(2)
    print(f"{Colors.GREEN}Closed {chrome_closed} Chrome processes{Colors.RESET}")

def get_otp_code(username):
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            logs = subprocess.check_output(["docker", "logs", "django", "--tail", "200"]).decode('utf-8')
            
            otp_pattern = r"Hello " + re.escape(username) + r".*?Your authentication code is: (\d+)"
            otp_match = re.search(otp_pattern, logs, re.DOTALL)
            
            if not otp_match:
                otp_match = re.search(r"Your authentication code is: (\d+)", logs)
                
            if otp_match:
                return otp_match.group(1)
        except Exception as e:
            print(f"Error getting OTP from logs: {str(e)}")
        
        print(f"{Colors.RED}Attempt {attempt+1}: Could not find OTP for {username}, retrying...")
        time.sleep(3)
    
    return None

def handle_login(driver, username, password):
    print(f"Starting login process for {username}")
    
    try:
        driver.get(f"https://{host_ip}:8000/signin")
        print(f"Navigated to signin page for {username}")
        
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "signin-email-or-username"))
        )
        
        username_field = driver.find_element(By.ID, "signin-email-or-username")
        password_field = driver.find_element(By.ID, "login-password")
        
        username_field.clear()
        password_field.clear()
        
        for char in username:
            username_field.send_keys(char)
            time.sleep(0.1)
            
        for char in password:
            password_field.send_keys(char)
            time.sleep(0.1)
        
        login_button = driver.find_element(By.ID, "login-button")
        driver.execute_script("arguments[0].click();", login_button)
        print(f"Clicked login button for {username}")
        
        time.sleep(5)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "otp-code"))
            )
            print(f"OTP page loaded for {username}")
            
            # Get OTP code
            otp_code = get_otp_code(username)
            
            if otp_code:
                print(f"Found OTP code for {username}: {otp_code}")
                
                # Enter OTP
                otp_field = driver.find_element(By.ID, "otp-code")
                otp_field.clear()
                
                for char in otp_code:
                    otp_field.send_keys(char)
                    time.sleep(0.1)
                
                # Submit OTP
                otp_button = driver.find_element(By.ID, "otp-button")
                driver.execute_script("arguments[0].click();", otp_button)
                print(f"Submitted OTP for {username}")
                
                # Wait for authentication
                time.sleep(5)
                
                # Navigate to profile page or tournament page
                page_url = f"https://{host_ip}:8000/profile"
                if tournament_id is not None and tournament_status != "check_notification":
                    page_url = f"https://{host_ip}:8000/tournament/{tournament_id}"
                elif tournament_id is not None and username == "pia":
                    page_url = f"https://{host_ip}:8000/tournament/{tournament_id}"
                print(f"Navigating to tournament page for {username}: {page_url}")
                driver.get(page_url)
                
                print(f"{Colors.GREEN}Login successful for {username} and navigated to profile.{Colors.RESET}")
                return True
            else:
                print(f"{Colors.RED}Could not get OTP code for {username}{Colors.RESET}")
                return False
                
        except Exception as e:
            print(f"OTP error for {username}: {str(e)}")
            return False
            
    except Exception as e:
        print(f"Login error for {username}: {str(e)}")
        return False

# Main function to open windows with multiple tabs and handle logins
def main():
    close_existing_chrome_windows()
    
    user_index = 0
    all_drivers = []  # Keep track of all driver instances
    
    # Use separate windows with different user data directories for each user
    for window_idx, tabs_count in enumerate(TABS_PER_WINDOW):
        print(f"{Colors.BLUE}Opening window {window_idx+1} with {tabs_count} tabs{Colors.RESET}")
        
        # Create the main window and tabs
        for tab in range(tabs_count):
            if user_index >= len(users):
                print(f"Not enough users defined for tab {tab+1} in window {window_idx+1}")
                continue
                
            current_user = users[user_index]
            
            # Set up Chrome options with a unique user data directory for each user
            chrome_options = Options()
            chrome_options.add_argument("--ignore-certificate-errors")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            chrome_options.add_argument("--incognito")
            chrome_options.add_argument("--disk-cache-size=1")
            
            # Create a unique user data directory for each user to ensure session isolation
            # user_data_dir = f"/tmp/chrome_user_data_{current_user['username']}"
            # chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
            
            # Keep browser open after script ends
            chrome_options.add_experimental_option("detach", True)
            
            # Position window on screen - adjust for each tab to create a tiled effect
            position_x = (window_idx % 2) * 800 + (tab * 50)
            position_y = (window_idx // 2) * 600 + (tab * 50)
            chrome_options.add_argument(f"--window-position={position_x},{position_y}")
            chrome_options.add_argument(f"--window-size=800,600")
            
            # Create a new Selenium session with a separate process group to prevent Ctrl+C propagation
            service = Service(ChromeDriverManager().install())
            
            # Use different approaches based on the operating system
            if os.name == 'nt':  # Windows
                service = Service(ChromeDriverManager().install(), 
                                 popen_kw={"creation_flags": subprocess.CREATE_NEW_PROCESS_GROUP})
            else:  # Unix/Linux/Mac
                service = Service(ChromeDriverManager().install(), 
                                 popen_kw={"preexec_fn": os.setpgrp})
                
            driver = webdriver.Chrome(service=service, options=chrome_options)
            all_drivers.append(driver)
            driver.execute_cdp_cmd('Network.setCacheDisabled', {'cacheDisabled': True})
            
            # Handle login
            success = handle_login(driver, current_user["username"], current_user["password"])
            
            if success:
                print(f"Window {window_idx+1}, Tab {tab+1} logged in as {current_user['username']}")
                user_index += 1
            else:
                print(f"Login failed for {current_user['username']}")
    
    # After all windows and tabs are set up
    print(f"{Colors.GREEN}All windows and tabs created and login processes completed.{Colors.RESET}")
    print(f"Total of {user_index} users logged in across {len(all_drivers)} windows.")
    
    # Optional: Add a function to navigate all users to a specific page
    def navigate_all_to_page(page_path):
        print(f"Navigating all tabs to {page_path}...")
        for driver_idx, driver in enumerate(all_drivers):
            try:
                # Navigate to the specified page
                driver.get(f"https://{host_ip}:8000/{page_path}")
                print(f"Navigated window {driver_idx+1} to {page_path}")
            except Exception as e:
                print(f"Error navigating window {driver_idx+1}: {str(e)}")
    
    # Register cleanup function to handle script exit
    def on_exit():
        print(f"{Colors.YELLOW}Script is exiting, but browsers will remain open.{Colors.RESET}")
        print("You can continue using the browser windows manually.")
    
    atexit.register(on_exit)
    
    # Wait a short time to ensure everything is set up properly
    time.sleep(5)
    
    # Print final message and exit naturally
    print(f"{Colors.GREEN}Script execution complete. Browser windows will remain open.{Colors.RESET}")
    print(f"{Colors.GREEN}You can continue using the browser windows manually.{Colors.RESET}")
    
    # Script will now exit naturally, leaving browser windows open

if __name__ == "__main__":
    main()
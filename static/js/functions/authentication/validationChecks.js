/* 
REQUIREMENTS as per Django authentication system:
https://docs.djangoproject.com/en/5.1/ref/contrib/auth/#django.contrib.auth.models.User 

* Username: 
    * 150 characters or fewer in Django by default. May need to customise the User model in order to accommodate unicode characters, which our postgres configuration accepts (chinese characters, emojis etc.)
    * may contain alphanumeric, _, @, +, . and - characters.
    *
* Password:
    * Minimum 6 characters 
    * Maximum 128 characters
    * password similarity check (to username and email)
    * common password validator
    * numeric password validator

* Email:
    * 254 characters or fewer in Django by default
    * must be unique
    * must be a valid email address
*/

class NBP {
    static instance = null;
    static isInitialised = false;
    commonPasswords = new Set();

    static async init(fileName = "NIST_bad_passwords.txt", path = "./static/js/functions/authentication/", verbose = false) { 
        if (!NBP.instance) {
            NBP.instance = new NBP();
            try {
                const response = await fetch(`${path}${fileName}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch password list: ${response.statusText}`);
                }
                const text = await response.text();
                const passwords = text.split('\n').map(pwd => pwd.trim());
                NBP.instance.commonPasswords = new Set(passwords);
                NBP.isInitialised = true;
                return true;
            }
            catch (error) {
                // console.log("Failed to load common passwords", error);
                NBP.instance = null;
                NBP.isInitialised = false;
                throw error;
            }
        }
        if (NBP.isInitialised) return true;
    }

    static async isCommonPassword(password) {
        if (!NBP.instance) {
            return false;
        }
        return NBP.instance.commonPasswords.has(password.toLowerCase());
    }
}

export class UserValidation {
    constructor() {
        this.errors = new Map();
        this.nbpInitialized = false;
    }

    async init() {
        try {
            await NBP.init("NIST_bad_passwords.txt", "./static/js/functions/authentication/", true);
            this.nbpInitialized = true;
        } catch (error) {
            // console.log("Failed to initialise NBP", error);
            this.nbpInitialized = false;
        }
    }

    validateUsername(username) {
        // console.log(`username is ${username}`);
        this.errors.delete("username");
        const usernameRegex = /^[a-zA-Z0-9]+$/; // regular expression
        if (!username || username.length < 2 || username.length > 15) {
            this.addError('username', 'Username must be between 2 and 15 characters.');
            return false;
        } 
        else if (!usernameRegex.test(username)) {
            this.addError("username", "Username contains invalid characters.");
            return false;            
        }
        return true;
    }

    validateEmail(email) {
        this.errors.delete("email");
        if (!email) {
            this.addError('email', 'Email cannot be empty.');
            return false;
        }
        if (email.length > 254) {
            this.addError('email', 'Email is too long.');
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // regular expression
        if (!email || email.length > 254) {
            this.addError('email', 'Email must be 254 characters or fewer.');
            return false;
        } 
        else if (!emailRegex.test(email)) {
            this.addError("email", "Email invalid.");
            return false;
        }
        return true;
    }

    async validatePassword(password, password2, username = null, email = null) {
        this.errors.delete("password");
        if (password !== password2) {
            this.addError("password", "Passwords do not match.");
            return false;
        }
        let isValid = true;
        
                if (!password || password.length < 6 )
                {
                    this.addError("password", "Password must be at least 6 characters.");
                    isValid = false;
                }
                if ( password.length > 128 ) {
                    this.addError("password", "Password is too long.");
                    isValid = false;
                }
                
                if (/^\d+$/.test(password)) {
                    this.addError("password", "Password must not be entirely numeric.");
                    isValid = false;
                }
                const similarityTreshold = 0.7;
                if (username && this.calculateSimilarity(password.toLowerCase(), username.toLowerCase()) > similarityTreshold) {
                    this.addError("password", "Password is too similar to username.");
                    isValid = false;
                }
                if (email) {
                    const emailUsername = email.split('@')[0];
                    if (this.calculateSimilarity(password.toLowerCase(), emailUsername.toLowerCase()) > similarityTreshold) {
                        this.addError("password", "Password is too similar to email.");
                        isValid = false;
                    }
                }
                if (isValid === false) {
                    return isValid;
                }
                if (this.nbpInitialized) {
                    try {
                        if (await NBP.isCommonPassword(password)) {
                            this.addError("password", "Password is too common.");
                            isValid = false;
                        }
                    } 
                    catch (error) {
                        // console.log("NBP check failed: ", error);
                        isValid = this.performBasicCommonPasswordCheck(password);
                    }
                }
                else {
                    // console.log("NBP not initialised. Performing basic check.");
                    isValid = this.performBasicCommonPasswordCheck(password);
                }
                return isValid;
            }
            
    calculateSimilarity(str1, str2) {
        // Using Levenshtein distance to calculate similarity
        const matrix = Array(str2.length + 1).fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        // Initialize first row and column
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        // Fill in the rest of the matrix
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        // Calculate similarity ratio
        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        return 1 - (distance / maxLength);
    }
    
    addError(field, message) {
        if (!this.errors.has(field)) {
            this.errors.set(field, []);
        }
        this.errors.get(field).push(message); // this appends to existing errors rather than overwriting (with this.errors.set(field, message))
    }
    
    performBasicCommonPasswordCheck(password) {
        const basic_common_passwords = [
            'password', '123456', 'qwerty', 'admin', 'welcome',
            'letmein', 'password123', '12345678', 'abc123', '111111'
        ];
        if (basic_common_passwords.includes(password.toLowerCase())) {
            this.addError("password", "Password is too common.");
            return false;
        }
        return true;
    }

    getErrors() {
        const errorObject = {};
        for (const [field, messages] of this.errors) {
            errorObject[field] = messages;
        }
        return errorObject;
    }

    async validateAll(username, email, password1, password2) {
        const results = {
            isValid: true,
            errors: {}
        };

        const usernameValid = this.validateUsername(username);
        const emailValid = this.validateEmail(email);
        const passwordValid = await this.validatePassword(password1, password2, username, email);

        results.isValid = usernameValid && emailValid && passwordValid;
        results.errors = this.getErrors();

        return results;
    }
}
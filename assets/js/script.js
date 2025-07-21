document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadingContainer = document.getElementById('loading-container');
    const terminal = document.getElementById('terminal');
    
    function jsonToColoredText(obj, indent = '') {
        if (obj === null) {
            return `<span class="json-null">null</span>`;
        }
        
        if (typeof obj === 'string') {
            return `<span class="json-string">"${obj}"</span>`;
        }
        
        if (typeof obj === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }
        
        if (typeof obj === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            
            let result = '[\n';
            for (let i = 0; i < obj.length; i++) {
                result += indent + '  ' + jsonToColoredText(obj[i], indent + '  ');
                if (i < obj.length - 1) result += ',';
                result += '\n';
            }
            return result + indent + ']';
        }
        
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            
            let result = '{\n';
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                result += `${indent}  <span class="json-key">"${key}"</span>: ${jsonToColoredText(obj[key], indent + '  ')}`;
                if (i < keys.length - 1) result += ',';
                result += '\n';
            }
            return result + indent + '}';
        }
        
        return obj;
    }
    
    function logToTerminal(message, isError = false) {
        const line = document.createElement('div');
        line.className = isError ? 'error-message' : '';
        
        if (typeof message === 'object') {
            line.innerHTML = jsonToColoredText(message);
        } else {
            line.textContent = message;
        }
        
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }
    
    function clearTerminal() {
        terminal.innerHTML = '';
    }
    
    searchBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        if (!username) return;
        
        loadingContainer.style.display = 'flex';
        clearTerminal();
        
        try {
            const userData = await fetchGitHubUser(username);
            
            setTimeout(() => {
                loadingContainer.style.display = 'none';
                
                if (userData.error) {
                    if (userData.error === "Rate limit yedin!") {
                        logToTerminal({
                            error: userData.error,
                            rate_limit: userData.rate_limit,
                            reset_time: userData.reset_time
                        }, true);
                        
                        const rateLimitLine = document.createElement('div');
                        rateLimitLine.className = 'rate-limit';
                        rateLimitLine.textContent = 'RATE LIMIT YEDİN! API anahtarı olmadan saatlik 60 istek hakkın var.';
                        terminal.appendChild(rateLimitLine);
                    } else {
                        logToTerminal(userData, true);
                    }
                } else {
                    logToTerminal(userData);
                }
            }, 1000);
        } catch (error) {
            loadingContainer.style.display = 'none';
            logToTerminal({ error: error.message }, true);
        }
    });
    
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        clearTerminal();
    });
    
    logToTerminal("GitHub kullanıcı bilgisi sorgulama aracına hoş geldiniz!");
    logToTerminal("Bir kullanıcı adı girip arama yapın.");
});

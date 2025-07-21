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
            if (obj.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
                return `<span class="json-string">"<span class="json-date">${obj}</span>"</span>`;
            }
            if (obj.startsWith('http')) {
                return `<span class="json-string">"<a href="${obj}" target="_blank" class="json-url">${obj}</a>"</span>`;
            }
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
            
            let result = '[';
            if (obj.length <= 3 && obj.every(item => typeof item !== 'object')) {
                result += obj.map(item => jsonToColoredText(item)).join(', ');
                result += ']';
                return result;
            }
            
            result += '\n';
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
            
            if (keys.length <= 3 && keys.every(key => typeof obj[key] !== 'object')) {
                let result = '{ ';
                result += keys.map(key => 
                    `<span class="json-key">"${key}"</span>: ${jsonToColoredText(obj[key])}`
                ).join(', ');
                return result + ' }';
            }
            
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
        line.className = isError ? 'error-message' : 'terminal-line';
        
        if (typeof message === 'object') {
            const title = document.createElement('div');
            title.className = 'terminal-title';
            title.textContent = isError ? 'HATA' : 'SONUÇ';
            line.appendChild(title);
            
            const content = document.createElement('pre');
            content.className = 'terminal-content';
            content.innerHTML = jsonToColoredText(message);
            line.appendChild(content);
            
            const timestamp = document.createElement('div');
            timestamp.className = 'terminal-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();
            line.appendChild(timestamp);
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
        logToTerminal(`Kullanıcı aranıyor: ${username}`);
        
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
                    const formattedData = {
                        "Kullanıcı Bilgileri": {
                            "Kullanıcı Adı": userData.username,
                            "Ad": userData.name,
                            "Bio": userData.bio,
                            "Oluşturulma Tarihi": userData.created_at,
                            "Son Güncelleme": userData.updated_at,
                            "Takipçi Sayısı": userData.followers,
                            "Takip Edilen": userData.following,
                            "Genel Repolar": userData.public_repos
                        },
                        "Gmail Bilgileri": {
                            "Email": userData.email,
                            "Diğer Email'ler": userData.other_emails.length > 0 ? userData.other_emails : null
                        },
                        "Repo İstatistikleri": {
                            "Toplam Repo": userData.repos_count,
                            "Örnek Repolar": userData.repos.slice(0, 3).map(repo => ({
                                "Repo Adı": repo.name,
                                "Açıklama": repo.description,
                                "Dil": repo.language,
                                "Yıldızlar": repo.stars
                            }))
                        }
                    };
                    
                    logToTerminal(formattedData);
                }
            }, 1000);
        } catch (error) {
            loadingContainer.style.display = 'none';
            logToTerminal({ 
                error: error.message,
                details: "API isteği sırasında bir hata oluştu"
            }, true);
        }
    });
    
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        clearTerminal();
        logToTerminal("Terminal temizlendi. Yeni bir arama yapabilirsiniz.");
    });
    
    logToTerminal("GitHub Kullanıcı Bilgisi Sorgulama Aracı");
    logToTerminal("----------------------------------------");
    logToTerminal("Bir GitHub kullanıcı adı girip arama yapın. Örnek: 'torvalds'");
});

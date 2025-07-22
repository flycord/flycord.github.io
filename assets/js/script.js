document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadingContainer = document.getElementById('loading-container');
    const terminal = document.getElementById('terminal');
    const mainGui = document.getElementById('main-gui');
    const userGui = document.getElementById('user-gui');
    const closeBtn = document.getElementById('close-btn');

    const ipInput = document.getElementById('ip-input');
    const ipSearchBtn = document.getElementById('ip-search-btn');
    const ipClearBtn = document.getElementById('ip-clear-btn');
    const ipLoadingContainer = document.getElementById('ip-loading-container');
    const ipTerminal = document.getElementById('ip-terminal');
    const ipGui = document.getElementById('ip-gui');
    const ipInfoGui = document.getElementById('ip-info-gui');
    const ipCloseBtn = document.getElementById('ip-close-btn');
    
    const githubSearchBtn = document.getElementById('github-search-btn');
    const ipLookupBtn = document.getElementById('ip-lookup-btn');
    
    const ipAddress = document.getElementById('ip-address');
    const ipType = document.getElementById('ip-type');
    const ipLocation = document.getElementById('ip-location');
    const ipCountry = document.getElementById('ip-country');
    const ipCity = document.getElementById('ip-city');
    const ipIsp = document.getElementById('ip-isp');
    const ipOrg = document.getElementById('ip-org');
    const ipPostal = document.getElementById('ip-postal');
    const ipTimezone = document.getElementById('ip-timezone');
    
    githubSearchBtn.addEventListener('click', () => {
        githubSearchBtn.classList.add('active');
        ipLookupBtn.classList.remove('active');
        mainGui.style.display = 'block';
        ipGui.style.display = 'none';
    });
    
    ipLookupBtn.addEventListener('click', () => {
        ipLookupBtn.classList.add('active');
        githubSearchBtn.classList.remove('active');
        mainGui.style.display = 'none';
        ipGui.style.display = 'block';
    });
    
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userUsername = document.getElementById('user-username');
    const userBio = document.getElementById('user-bio');
    const userEmail = document.getElementById('user-email');
    const userCreated = document.getElementById('user-created');
    const userFollowers = document.getElementById('user-followers');
    const userFollowing = document.getElementById('user-following');
    const userRepos = document.getElementById('user-repos');
    const otherEmailsContainer = document.getElementById('other-emails-container');
    const otherEmailsList = document.getElementById('other-emails-list');
    
    closeBtn.addEventListener('click', () => {
        userGui.style.display = 'none';
        mainGui.style.display = 'block';
    });
    
    async function safeGetJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 403) {
                    const rateLimit = await checkRateLimit();
                    throw new Error(`API rate limit exceeded. Reset at: ${rateLimit.reset_time}`);
                }
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return null;
        }
    }

    async function checkRateLimit() {
        const rateLimitUrl = 'https://api.github.com/rate_limit';
        const rateData = await safeGetJson(rateLimitUrl);
        if (rateData) {
            return {
                remaining: rateData.rate.remaining,
                limit: rateData.rate.limit,
                reset_time: new Date(rateData.rate.reset * 1000).toLocaleTimeString()
            };
        }
        return { remaining: 0, limit: 0, reset_time: 'Unknown' };
    }

    async function getRepos(username, limit = 100) {
        const reposUrl = `https://api.github.com/users/${username}/repos?per_page=${limit}`;
        const repos = await safeGetJson(reposUrl);
        if (!repos) return [];
        
        return repos
            .filter(repo => !repo.fork)
            .slice(0, limit)
            .map(repo => ({
                name: repo.name,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                created_at: repo.created_at,
                updated_at: repo.updated_at,
                html_url: repo.html_url
            }));
    }

    async function getEmailsFromRepoCommits(username, repoName, limit = 100) {
        const commitsUrl = `https://api.github.com/repos/${username}/${repoName}/commits?per_page=${limit}`;
        const commits = await safeGetJson(commitsUrl);
        if (!commits) return [];
        
        const emails = new Set();
        commits.forEach(commit => {
            if (commit.commit && commit.commit.author && commit.commit.author.email) {
                const email = commit.commit.author.email;
                if (email.includes('@gmail.com')) {
                    emails.add(email);
                }
            }
        });
        
        return Array.from(emails);
    }

    async function fetchIPInfo(ipAddress) {
        try {
            const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            if (!response.ok) {
                throw new Error('IP bilgisi alınamadı');
            }
            return await response.json();
        } catch (error) {
            console.error('IP bilgisi alınırken hata:', error);
            return { error: error.message };
        }
    }

    function displayIPInfo(ipData) {
        ipGui.classList.add('blurred');
        
        ipAddress.textContent = ipData.ip || 'Bilinmiyor';
        ipType.textContent = `Type: ${ipData.version || 'Bilinmiyor'}`;
        ipLocation.textContent = `Location: ${ipData.city || 'Bilinmiyor'}, ${ipData.region || 'Bilinmiyor'}`;
        ipCountry.textContent = `Country: ${ipData.country_name || 'Bilinmiyor'} (${ipData.country || 'Bilinmiyor'})`;
        ipCity.textContent = `City: ${ipData.city || 'Bilinmiyor'}`;
        ipIsp.textContent = `ISP: ${ipData.org || ipData.asn || 'Bilinmiyor'}`;
        ipOrg.textContent = `Organization: ${ipData.org || 'Bilinmiyor'}`;
        ipPostal.textContent = `Postal Code: ${ipData.postal || 'Bilinmiyor'}`;
        ipTimezone.textContent = `Timezone: ${ipData.timezone || 'Bilinmiyor'}`;
        
        ipGui.style.opacity = '0';
        ipGui.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            ipGui.style.display = 'none';
            ipInfoGui.style.display = 'block';
            ipInfoGui.style.animation = 'fadeIn 0.5s ease-out';
        }, 300);
    }
    
    ipSearchBtn.addEventListener('click', async () => {
        const ip = ipInput.value.trim();
        if (!ip) return;
        
        ipLoadingContainer.style.display = 'flex';
        ipTerminal.innerHTML = '';
        
        try {
            const ipData = await fetchIPInfo(ip);
            
            setTimeout(() => {
                ipLoadingContainer.style.display = 'none';
                
                if (ipData.error) {
                    logToIPTerminal({ error: ipData.error }, true);
                } else {
                    displayIPInfo(ipData);
                }
            }, 1000);
        } catch (error) {
            ipLoadingContainer.style.display = 'none';
            logToIPTerminal({ error: error.message }, true);
        }
    });
    
    function logToIPTerminal(message, isError = false) {
        const line = document.createElement('div');
        line.className = isError ? 'error-message' : 'terminal-line';
        
        if (typeof message === 'object') {
            const formattedJson = JSON.stringify(message, null, 2)
                .split('\n')
                .map(line => line.replace(/ /g, '&nbsp;'))
                .join('<br>');
            line.innerHTML = formattedJson;
        } else {
            line.textContent = message;
        }
        
        ipTerminal.appendChild(line);
        ipTerminal.scrollTop = ipTerminal.scrollHeight;
    }
    
    ipClearBtn.addEventListener('click', () => {
        ipTerminal.innerHTML = '';
    });
    
    ipCloseBtn.addEventListener('click', () => {
        ipInfoGui.style.animation = 'fadeOut 0.5s ease-out';
        
        setTimeout(() => {
            ipInfoGui.style.display = 'none';
            ipGui.style.display = 'block';
            ipGui.style.opacity = '1';
            ipGui.classList.remove('blurred');
        }, 500);
    });

    async function fetchGitHubUser(username) {
        try {
            const userUrl = `https://api.github.com/users/${username}`;
            const userData = await safeGetJson(userUrl);
            
            if (!userData) {
                return { error: "Kullanıcı bulunamadı" };
            }
            
            const rateLimit = await checkRateLimit();
            if (rateLimit.remaining <= 1) {
                return { 
                    error: "Rate limit yedin!",
                    rate_limit: rateLimit,
                    message: `API rate limit exceeded. Reset at: ${rateLimit.reset_time}`
                };
            }
            
            const repos = await getRepos(username);
            
            let allEmails = new Set();
            if (repos.length > 0) {
                for (const repo of repos) {
                    try {
                        const emails = await getEmailsFromRepoCommits(username, repo.name);
                        emails.forEach(email => allEmails.add(email));
                    } catch (error) {
                        console.error(`${repo.name} repo'sunda email aranırken hata:`, error);
                    }
                }
            }
        
            const emailsArray = Array.from(allEmails);
            
            return {
                username: userData.login,
                name: userData.name,
                avatar_url: userData.avatar_url,
                bio: userData.bio,
                email: emailsArray.length > 0 ? emailsArray[0] : null,
                other_emails: emailsArray.length > 1 ? emailsArray.slice(1) : [],
                created_at: userData.created_at,
                updated_at: userData.updated_at,
                followers: userData.followers,
                following: userData.following,
                public_repos: userData.public_repos,
                repos_count: repos.length,
            };
        } catch (error) {
            console.error("GitHub API hatası:", error);
            return { 
                error: error.message,
                details: "GitHub API'den veri alınırken hata oluştu"
            };
        }
    }

function displayUserData(userData) {
    mainGui.classList.add('blurred');
    
    userAvatar.src = userData.avatar_url || 'https://via.placeholder.com/100';
    
    userName.textContent = userData.name || userData.username;
    userUsername.textContent = `@${userData.username}`;
    userBio.textContent = userData.bio || 'Bio bilgisi yok';
    userEmail.textContent = userData.email || 'E-posta bilgisi yok';
    
    const createdDate = new Date(userData.created_at);
    userCreated.textContent = `Hesap oluşturulma: ${createdDate.toLocaleDateString()}`;
    
    userFollowers.textContent = `Takipçiler: ${userData.followers}`;
    userFollowing.textContent = `Takip edilen: ${userData.following}`;
    
    userRepos.textContent = `Public Repolar: ${userData.public_repos} (${userData.repos_count} görüntülendi)`;
    
    if (userData.other_emails && userData.other_emails.length > 0) {
        otherEmailsContainer.style.display = 'block';
        otherEmailsList.innerHTML = '';
        
        userData.other_emails.forEach(email => {
            const li = document.createElement('li');
            li.textContent = email;
            otherEmailsList.appendChild(li);
        });
    } else {
        otherEmailsContainer.style.display = 'none';
    }
    
    mainGui.style.opacity = '0';
    mainGui.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        mainGui.style.display = 'none';
        userGui.style.display = 'block';
        userGui.style.animation = 'fadeIn 0.5s ease-out';
    }, 300);
}

closeBtn.addEventListener('click', () => {
    userGui.style.animation = 'fadeOut 0.5s ease-out';
    
    setTimeout(() => {
        userGui.style.display = 'none';
        mainGui.style.display = 'block';
        mainGui.style.opacity = '1';
        mainGui.classList.remove('blurred');
    }, 500);
});
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -45%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%); }
        to { opacity: 0; transform: translate(-50%, -45%); }
    }
`;
document.head.appendChild(style);

    function logToTerminal(message, isError = false) {
        const line = document.createElement('div');
        line.className = isError ? 'error-message' : 'terminal-line';
        
        if (typeof message === 'object') {
            const formattedJson = JSON.stringify(message, null, 2)
                .split('\n')
                .map(line => line.replace(/ /g, '&nbsp;'))
                .join('<br>');
            line.innerHTML = formattedJson;
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
                            message: userData.message
                        }, true);
                    } else {
                        logToTerminal(userData, true);
                    }
                } else {
                    displayUserData(userData);
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
});

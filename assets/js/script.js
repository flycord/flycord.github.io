document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadingContainer = document.getElementById('loading-container');
    const terminal = document.getElementById('terminal');
    const mainGui = document.getElementById('main-gui');
    const userGui = document.getElementById('user-gui');
    const closeBtn = document.getElementById('close-btn');
    
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
    
        mainGui.style.display = 'none';
        userGui.style.display = 'block';
    }

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

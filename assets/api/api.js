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
        
        let emails = [];
        if (repos.length > 0) {
            emails = await getEmailsFromRepoCommits(username, repos[0].name);
        }
        
        return {
            username: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
            bio: userData.bio,
            email: emails.length > 0 ? emails[0] : null,
            other_emails: emails.length > 1 ? emails.slice(1) : [],
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            followers: userData.followers,
            following: userData.following,
            public_repos: userData.public_repos,
            repos_count: repos.length,
            repos: repos,
            rate_limit: rateLimit
        };
    } catch (error) {
        console.error("GitHub API hatası:", error);
        return { 
            error: error.message,
            details: "GitHub API'den veri alınırken hata oluştu"
        };
    }
}

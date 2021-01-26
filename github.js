const { get } = require('axios');
const { take, flow, pick } = require('lodash');

const logger = require('./logger');

const [MAX_EVENTS, MAX_GISTS] = [5, 3];

const USER_PROPERTIES = [
    'id', 'node_id', 'created_at', 'url', 'updated_at', 'login', 'avatar_url', 'type',
    'site_admin', 'name', 'company', 'blog', 'location', 'email', 'hireable', 'bio',
    'twitter_username', 'public_repos', 'public_gists', 'followers', 'following',
    'created_at', 'updated_at', 'private_gists', 'total_private_repos', 'owned_private_repos',
    'collaborators', 'plan',
];
const EVENT_PROPERTIES = ['id', 'type', 'created_at'];
const GIST_PROPERTIES = ['id', 'node_id', 'created_at', 'url', 'description', 'updated_at', 'public', 'comments'];

const requestOptions = {
    headers: {
        Authorization: 'token 58237aa32c98f779f3345713b10a5104d380397f',
    },
};

const retrieveData = async (url) => get(url, requestOptions)
    .then(({ data }) => data)
    .catch((err) => logger.error(err) || null);

async function getUserData(username) {
    const baseUrl = `https://api.github.com/users/${username}`;
    const eventsUrl = `${baseUrl}/events`;
    const gistsUrl = `${baseUrl}/gists`;

    const urls = [baseUrl, eventsUrl, gistsUrl];
    const [user, events, gists] = await Promise.all(urls.map(retrieveData));

    return { user, events, gists };
}

const processUser = (user) => pick(user, USER_PROPERTIES);

const dateDescendentSorter = (a, b) => (
    new Date(b.created_at) - new Date(a.created_at)
);

const processEvents = flow(
    (events) => events || [],
    (events) => events.sort(dateDescendentSorter),
    (events) => take(events, MAX_EVENTS),
    (events) => events.map((event) => pick(event, EVENT_PROPERTIES)),
    (events) => events.reduce((eventMap, event) => ({ ...eventMap, [event.id]: event }), {}),
);

const processGists = flow(
    (gists) => gists || [],
    (gists) => gists.sort(dateDescendentSorter),
    (gists) => take(gists, MAX_GISTS),
    (gists) => gists.map((gist) => pick(gist, GIST_PROPERTIES)),
);

const processUserData = ({ user, events, gists }) => ({
    user: processUser(user),
    events: processEvents(events),
    gists: processGists(gists),
});

const getUser = async (username) => {
    const userData = await getUserData(username);
    if (!userData.user) return logger.info(`Sorry an error ocurried getting info about ${username}`);

    const { user, events, gists } = processUserData(userData);
    logger.info(`Processed ${username}`);
    return { ...user, events, gists };
};

module.exports = {
    getUser,
};

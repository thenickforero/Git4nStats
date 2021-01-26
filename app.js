const { getUser } = require('./github');
const logger = require('./logger');

const {
    MONGO_USERNAME,
    MONGO_PASSWORD,
    MONGO_HOSTNAME,
    MONGO_PORT,
    MONGO_DB,
} = process.env;

const dbURL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

const fastify = require('fastify')({ logger });
fastify.register(require('fastify-mongodb'), {
    forceClose: true,
    url: dbURL,
    useNewUrlParser: true,
    connectTimeoutMS: 10000,
});

fastify.route({
    method: 'POST',
    url: '/users',
    schema: {
        body: {
            type: 'object',
            properties: {
                usernames: { type: 'array' },
            },
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    data: { type: 'array' },
                    status: { type: 'string' },
                },
            },
        },
    },
    handler: async (request, reply) => {
        const { usernames } = request.body;
        const users = await Promise.all(usernames.map(getUser));
        const parsedUsers = users.filter((user) => typeof (user) !== 'undefined');

        if (parsedUsers.length > 0) {
            const { db } = fastify.mongo;
            const usersCollection = await db.collection('Users');

            const { insertedCount, insertedIds } = await usersCollection.insertMany(parsedUsers);
            logger.info({ insertedCount, insertedIds });
        }

        reply.send({ data: parsedUsers, status: `Processed ${parsedUsers.length} users` });
    },
});

fastify.route({
    method: 'GET',
    url: '/users',
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    data: { type: 'array' },
                    status: { type: 'string' },
                },
            },
        },
    },
    handler: async (request, reply) => {
        const { db } = fastify.mongo;
        const usersCollection = await db.collection('Users');
        const users = await usersCollection.find().toArray();

        logger.info(`Total Users: ${users.length}`);
        reply.send({ data: users, status: `${users.length} users in DB` });
    },
});

const start = async () => {
    try {
        await fastify.listen(3000, '0.0.0.0');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

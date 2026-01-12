const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Initialize Prisma
  let prisma;
  (async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const { Pool } = require('pg');
      
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({
          // @ts-ignore
          adapter: adapter,
        });
      }
    } catch (error) {
      console.error('Error initializing Prisma:', error);
    }
  })();

  // Track online users
  const onlineUsers = new Map(); // socket.id -> userId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    socket.on('send_message', async ({ roomId, userId, content }) => {
      try {
        if (!prisma) {
          console.error('Prisma not initialized');
          return;
        }
        
        // Get user info
        const userInfo = await prisma.$queryRaw`
          SELECT id, name, email FROM "User" WHERE id = ${userId} LIMIT 1
        `;
        const user = Array.isArray(userInfo) && userInfo.length > 0 ? userInfo[0] : null;

        // Create message using raw query
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newMessage = await prisma.$queryRaw`
          INSERT INTO "Message" ("id", "content", "type", "isRead", "userId", "roomId", "createdAt", "updatedAt")
          VALUES (${msgId}, ${content}, 'text', false, ${userId}, ${roomId}, NOW(), NOW())
          RETURNING *
        `;
        
        const message = Array.isArray(newMessage) && newMessage.length > 0 ? newMessage[0] : null;
        
        if (message && user) {
          message.user = user;
          message.roomId = roomId;
          io.to(roomId).emit('receive_message', message);
        }
      } catch (error) {
        console.error('Error creating message:', error);
      }
    });

    socket.on('send_direct_message', async ({ receiverId, userId, content, messageId }) => {
      try {
        // If messageId is provided, it means the message was already saved via API
        // We just need to emit it to the receiver, not save it again
        if (messageId) {
          // Get the message from database to emit to receiver
          try {
            const messageData = await prisma.$queryRaw`
              SELECT m.*, u.id as "user_id", u.name as "user_name", u.email as "user_email"
              FROM "Message" m
              JOIN "User" u ON m."userId" = u.id
              WHERE m.id = ${messageId}
              LIMIT 1
            `;
            
            if (messageData && Array.isArray(messageData) && messageData.length > 0) {
              const msg = messageData[0];
              const message = {
                id: msg.id,
                content: msg.content,
                type: msg.type,
                isRead: msg.isRead,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
                userId: msg.userId,
                directMessageId: msg.directMessageId,
                user: {
                  id: msg.user_id,
                  name: msg.user_name,
                  email: msg.user_email,
                },
              };
              
              // Emit to receiver only (sender already has it)
              io.to(`user_${receiverId}`).emit('receive_direct_message', message);
              const conversationId = [userId, receiverId].sort().join('_');
              io.to(`dm_${conversationId}`).emit('receive_direct_message', message);
              return;
            }
          } catch (error) {
            console.error('Error fetching message for socket emit:', error);
          }
        }
        
        // Fallback: Save message via socket (if API didn't work)
        if (!prisma) {
          console.error('Prisma not initialized');
          return;
        }
        
        // Find or create direct message conversation
        let directMessage = null;
        try {
          const existing = await prisma.$queryRaw`
            SELECT * FROM "DirectMessage" 
            WHERE ("senderId" = ${userId} AND "receiverId" = ${receiverId})
               OR ("senderId" = ${receiverId} AND "receiverId" = ${userId})
            LIMIT 1
          `;
          
          if (existing && Array.isArray(existing) && existing.length > 0) {
            directMessage = existing[0];
          }
        } catch (error) {
          console.error('Error finding direct message:', error);
        }

        if (!directMessage) {
          try {
            const id = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const newDM = await prisma.$queryRaw`
              INSERT INTO "DirectMessage" ("id", "senderId", "receiverId", "createdAt", "updatedAt")
              VALUES (${id}, ${userId}, ${receiverId}, NOW(), NOW())
              RETURNING *
            `;
            directMessage = Array.isArray(newDM) && newDM.length > 0 ? newDM[0] : null;
          } catch (error) {
            console.error('Error creating direct message:', error);
            return;
          }
        }

        // Get user info
        const userInfo = await prisma.$queryRaw`
          SELECT id, name, email FROM "User" WHERE id = ${userId} LIMIT 1
        `;
        const user = Array.isArray(userInfo) && userInfo.length > 0 ? userInfo[0] : null;

        // Create message
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newMessage = await prisma.$queryRaw`
          INSERT INTO "Message" ("id", "content", "type", "isRead", "userId", "directMessageId", "createdAt", "updatedAt")
          VALUES (${msgId}, ${content}, 'text', false, ${userId}, ${directMessage.id}, NOW(), NOW())
          RETURNING *
        `;
        
        const message = Array.isArray(newMessage) && newMessage.length > 0 ? newMessage[0] : null;
        
        if (message && user) {
          message.user = user;
          message.directMessageId = directMessage.id;
          // Emit to receiver only
          io.to(`user_${receiverId}`).emit('receive_direct_message', message);
          const conversationId = [userId, receiverId].sort().join('_');
          io.to(`dm_${conversationId}`).emit('receive_direct_message', message);
        }
      } catch (error) {
        console.error('Error creating direct message:', error);
      }
    });

    socket.on('user_online', ({ userId }) => {
      // Store user ID for this socket
      socket.userId = userId;
      onlineUsers.set(socket.id, userId);
      // Broadcast user online status
      socket.broadcast.emit('user_online', { userId });
      console.log(`User ${userId} is now online`);
    });

    socket.on('typing', ({ roomId, userId, isTyping }) => {
      const senderId = socket.userId || userId;
      console.log('Typing event:', { roomId, userId, senderId, isTyping });
      
      // Broadcast typing status to room or direct message recipient
      if (roomId) {
        // For room messages
        socket.to(roomId).emit('user_typing', { roomId, userId: senderId, isTyping });
      } else if (userId) {
        // For direct messages, emit to the other user
        socket.to(`user_${userId}`).emit('user_typing', { userId: senderId, isTyping });
        // Also emit to conversation room
        const conversationId = [senderId, userId].sort().join('_');
        socket.to(`dm_${conversationId}`).emit('user_typing', { userId: senderId, isTyping });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Broadcast user offline status if we have userId
      const userId = socket.userId || onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        io.emit('user_offline', { userId });
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

import { Server } from "socket.io";
import { prisma } from "@/lib/prisma";

export const ioHandler = (req: any, res: any) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("join_room", (roomId) => {
        socket.join(roomId);
        console.log("User joined room:", roomId);
      });

      socket.on("send_message", async ({ roomId, userId, content }) => {
        try {
          const message = await (prisma as any).message.create({
            data: { roomId, userId, content },
            include: { user: true },
          });
          io.to(roomId).emit("receive_message", message);
        } catch (error) {
          console.error("Error creating message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }
  res.end();
};

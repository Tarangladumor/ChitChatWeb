import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from '@/app/libs/prismadb'
import { NextResponse } from "next/server";
import { pusherServer } from "@/app/libs/pusher";


export async function POST(
    request:Request
) {
    try {
        const currentUser = await  getCurrentUser();
        const body  = await request.json();
        const {
            message,
            image,
            conversationId
        } = body;

        if(!currentUser?.id || !currentUser?.email){
            return new NextResponse('Unauthorized', {status:401});
        }  

        const newMessage = await prisma.message.create({
            data: {
                body: message,
                image:image,
                conversation: {
                    connect: {
                        id:conversationId
                    }
                },
                sender: {
                    connect: {
                        id: currentUser.id
                    }
                },
                seen: {
                    connect: {
                        id: currentUser.id
                    }
                },
            },
            include: {
                seen: true,
                sender: true
            }
        });

        const updatedConversation = await prisma.conversation.update({
            where: {
                id:conversationId
            },
            data: {
                lastMessageAt: new Date(),
                message: {
                    connect: {
                        id: newMessage.id
                    }
                }
            },
            include: {
                users:true,
                message: {
                    include: {
                        seen: true
                    }
                }
            }
        });

        await pusherServer.trigger(conversationId,'message:new', newMessage);

        const lastMessage = updatedConversation.message[updatedConversation.message.length - 1];

        updatedConversation.users.map((user) => {
            pusherServer.trigger(user.email!, 'conversation:update', {
                id: conversationId,
                message: [lastMessage]
            })
        })

        return NextResponse.json(newMessage);
    } catch (error : any) {
        console.log(error,'ERROR_MESSAGES');
        return new NextResponse('InternalError', {status:500});
    }
}
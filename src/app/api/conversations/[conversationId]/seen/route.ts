import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from '@/app/libs/prismadb'
import { pusherServer } from "@/app/libs/pusher";

interface Iparams {
    conversationId?: string;
};

export async function POST(
    request:Request,
    { params }: {params : Iparams}
){
    try {
        const currentUser = await getCurrentUser();
        const {
            conversationId
        } = params;

        if(!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorised', {status:401});
        }

        //find the existing conversation

        const conversation = await prisma.conversation.findUnique({
            where: {
                id:conversationId,
            },
            include: {
                message: {
                    include: {
                        seen: true
                    }
                },
                users: true,
            }
        });

        if(!conversation) {
            return new NextResponse('InvalidId',{status:400});
        }

        const lastMessage = conversation.message[conversation.message.length - 1];

        if(!lastMessage){
            return NextResponse.json(conversation);
        }

        //update seen of last message

        const updatedMessage = await prisma.message.update({
            where: {
                id: lastMessage.id
            },
            include: {
                sender:true,
                seen:true 
            },
            data:{
                seen: {
                    connect : {
                        id:currentUser.id
                    }
                }
            }
        });

        await pusherServer.trigger(currentUser.email, 'conversation:update', {
            id: conversationId,
            message: [updatedMessage]
        });

        if(lastMessage.seenIds.indexOf(currentUser.id) !== -1){
            return NextResponse.json(conversation);
        }

        await pusherServer.trigger(conversationId!, 'message:update', updatedMessage);

        return NextResponse.json(updatedMessage);
    } catch(error:any){
        console.log(error, 'ERROR_MESSAGES_SEEN');
        return new NextResponse("Internal Error", {status:500});
    }
}
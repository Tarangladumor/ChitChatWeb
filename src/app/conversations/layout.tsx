import getConversation from "../actions/getConversations"
import getUsers from "../actions/getUsers";
import Sidebar from "../components/sidebar/Sidebar"
import ConversationList from "./components/ConversationList"

export default async function conversationsLayout({
    children
} : {
    children : React.ReactNode 
}) {
    const conversations = await getConversation();
    const users = await getUsers();
    return(
        <Sidebar>
            <div className="h-full">
                <ConversationList users={users} initialItems={conversations}/>
                {children}
            </div>
        </Sidebar>
    )
}
import { AuthenticationError } from "apollo-server-core";
import { MiddlewareFn } from "type-graphql";


export const checkAuth: MiddlewareFn<any> =({context},next)=>{
    if(!context.req.session.userId)
    throw new AuthenticationError("ban chua dang nhap")
    return next()
}    
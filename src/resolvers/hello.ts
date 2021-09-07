import { Resolver, Query,Ctx} from "type-graphql"

@Resolver()
export class HelloResolver {
    @Query(_return=>String)
    
    hello(
        @Ctx() context:any
    ){
        console.log(context.req.session.userId)
        return "Hello word"
    }
}
require("dotenv").config();
import "reflect-metadata";
import express from "express";
import cors from "cors"
import mongoose from "mongoose"
import {ApolloServer} from "apollo-server-express";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import {  buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import {ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core"
import { UserResolver } from "./resolvers/User";
import MongoStore from "connect-mongo";
import session from "express-session";
import { COOKIE_NAME, __prod__ } from "./constants";
import { PostResolver } from "./resolvers/Post";
import { Upvote } from "./entities/Upvote";

const main=async ()=>{
    // connect Database
    const connection=await createConnection({
        type:"postgres",
        database:"youtube-henry-dev",
        username:process.env.DB_USERNAME_DEV,
        password:process.env.DB_PASSWORD_DEV,
        logging:true,
        synchronize:true,
        entities:[User,Post,Upvote] // tham chieu model voi model trong db
    })
    console.log("connect db success")
    const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@cluster0.e8uzm.mongodb.net/Project0?retryWrites=true&w=majority`
	await mongoose.connect(mongoUrl, {
		useCreateIndex: true,
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})



    const app=express();

    app.use(cors({
        origin:"http://localhost:3000",
        credentials:true
    }))
    
    app.use(session({
        name:COOKIE_NAME,
        store: MongoStore.create({ mongoUrl}),
        cookie:{
            maxAge:1000*60*60,
            httpOnly:true, //js fontend not read cookie
            secure: __prod__,
            sameSite:'lax'
        },
        secret:"phan quang vu",
        resave:false,
        saveUninitialized:false //dont save empty sessions
      }));
    
    const apolloServer= new ApolloServer({
        schema: await buildSchema({
            resolvers:[HelloResolver,UserResolver,PostResolver],
            validate:false
        }),
        context:({req,res})=>({req,res,connection})
        ,
        plugins: [ApolloServerPluginLandingPageGraphQLPlayground()]
    })

    await apolloServer.start()

    apolloServer.applyMiddleware({app,cors:false});

    const PORT=process.env.PORT|| 4000;

    app.listen(PORT,()=>console.log(`server started on port ${PORT}`))
}

main().catch(err=>console.log(err))
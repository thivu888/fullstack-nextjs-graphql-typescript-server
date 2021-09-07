import { Field, ObjectType,ID } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Post } from "./Post";
import { Upvote } from "./Upvote";

@ObjectType()
@Entity() // khai bao 1  model trong db
export class User extends BaseEntity {

    @Field(_type=>ID)
    @PrimaryGeneratedColumn()
    id!:number

    @Field()
    @Column({unique:true})
    username!:string

    @Field()
    @Column({unique:true})
    email!:string

    @Column()
    password!:string

    @Field(_type=>[Post])
    @OneToMany(()=>Post,post=>post.user)
    posts:Post[] 

    @OneToMany(_to => Upvote, upvote => upvote.user)
	upvotes: Upvote[]

    @Field()
    @CreateDateColumn()
    createdAt:Date

    @Field()
    @UpdateDateColumn()
    updatedAt:Date
}
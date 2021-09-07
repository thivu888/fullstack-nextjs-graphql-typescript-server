import { Field, ObjectType,ID } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Upvote } from "./Upvote";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {

    @Field(_type=>ID)
    @PrimaryGeneratedColumn()
    id!:number

    @Field()
    @Column()
    title!:string

    @Field()
    @Column()
    text!:string

    @Field()
    @Column()
    userId!:number

    @Field()
	@Column({ default: 0 })
	points!: number

	@Field()
	voteType!: number

    @Field(_type=>User)
    @ManyToOne(()=>User,user=>user.posts)
    user:User 

    @OneToMany(() => Upvote, upvote => upvote.post)
	upvotes: Upvote[]
    
    @Field()
    @CreateDateColumn({type:'timestamptz'})
    createdAt:Date

    @Field()
    @UpdateDateColumn({type:'timestamptz'})
    updatedAt:Date
}
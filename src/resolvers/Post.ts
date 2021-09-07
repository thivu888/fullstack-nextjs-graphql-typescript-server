import { PostMutationResponse } from "../types/PostMutationResponse";
import { Arg, Mutation, Resolver,Query ,ID,  UseMiddleware, FieldResolver, Root, Ctx, Int, registerEnumType} from "type-graphql";
import { CreatePostInput } from "../types/CreatePostInput";
import { Post } from "../entities/Post";
import { UpdatePostInput } from "../types/UpdatePostInput";
import { checkAuth } from "../middleware/Auth";
import { User } from "../entities/User";
import { PaginatedPosts } from "../types/PaginatedPosts";
import {  LessThan } from "typeorm";
import { VoteType } from "../types/VoteType";
import { UserInputError } from "apollo-server-core";
import { Upvote } from "../entities/Upvote";

registerEnumType(VoteType, {
	name: 'VoteType' // this one is mandatory
})

@Resolver(_of=>Post)
export class PostResolver{


    @FieldResolver(_return=>User)
    async user(
        @Root() root:Post
    ){
        return await User.findOne(root.userId)
    }

    @FieldResolver(_return=>String)
    async textSnippet(
        @Root() root:Post
    ){
        return root.text.slice(0,60);
    }

    @FieldResolver(_return => Int)
	async voteType(
		@Root() root: Post,
		@Ctx()  context:any
	) {
        console.log('1111111111111111111111111111',context.req.session.userId)
		if (!context.req.session.userId) return 0
		const existingVote = await Upvote.findOne({
			postId: root.id,
			userId: context.req.session.userId
		})

		// const existingVote = await voteTypeLoader.load({
		// 	postId: root.id,
		// 	userId: req.session.userId
		// })

		return existingVote ? existingVote.value : 0
	}

    @Mutation(_return=>PostMutationResponse)
    async  createPost(
        @Arg('createPostInput') {title,text}:CreatePostInput,
        @Ctx() context:any
        ):Promise<PostMutationResponse>
    {
        try {
            const newPost=Post.create({
                title,
                text,
                userId:context.req.session.userId
            })
          const newPostResponse=await Post.save(newPost); 
          return{
              code:200,
              success:true,
              message:"create successfully",
              post:newPostResponse
          }

        } catch (error) {
            console.log(error)
            return{
                code:400,
                success:false,
                message:"create fail",
                errors:[{message:"create fail",field:"create error"}]
            }
        }
        
    }

    @Mutation(_type=>PostMutationResponse)
    async updatePost(@Arg("updatePostInput") {id,title,text}:UpdatePostInput,
    @Ctx() context:any
    ):Promise<PostMutationResponse>{
        const existPost= await Post.findOne(id)
        if(!existPost){
            return{
                code:400,
                success:false,
                message:"post not found"
            }
        }
        if(existPost.userId!==context.req.session.userId){
            return{
                code:401,
                success:false,
                message:"invalid auth"
            }
        }
        existPost.text=text;
        existPost.title=title;
        await existPost.save();
        return{
            code:200,
            success:true,
            message:"update successfully",
            post:existPost
        }
    }

    @Mutation(_return=>PostMutationResponse)
    @UseMiddleware(checkAuth)
    async deletePost(@Arg('id',_type=>ID) id:number,
    @Ctx() context:any
    ):Promise<PostMutationResponse>{

        const existPost= await Post.findOne(id)
        if(!existPost){
            return{
                code:400,
                success:false,
                message:"post not found"
            }
        }
        if(existPost.userId!==context.req.session.userId){
            return{
                code:401,
                success:false,
                message:"invalid auth"
            }
        }
        await Post.delete({id})
        return{
            code:200,
            success:true,
            message:"delete successfully"
        }
    }

    @Mutation(_return => PostMutationResponse)
	@UseMiddleware(checkAuth)
	async vote(
		@Arg('postId', _type => Int) postId: number,
		@Arg('inputVoteValue', _type => VoteType) inputVoteValue: VoteType,
		@Ctx() context:any
	): Promise<PostMutationResponse> {
		return await context.connection.transaction(async (transactionEntityManager:any) => {
			// check if post exists
			let post = await transactionEntityManager.findOne(Post, postId)
			if (!post) {
				throw new UserInputError('Post not found')
			}

			// check if user has voted or not
			const existingVote = await transactionEntityManager.findOne(Upvote, {
				postId,
				userId:context.req.session.userId
			})

			if (existingVote && existingVote.value !== inputVoteValue) {
				await transactionEntityManager.save(Upvote, {
					...existingVote,
					value: inputVoteValue
				})

				post = await transactionEntityManager.save(Post, {
					...post,
					points: post.points + 2 * inputVoteValue
				})
			}

			if (!existingVote) {
				const newVote = transactionEntityManager.create(Upvote, {
					userId:context.req.session.userId,
					postId,
					value: inputVoteValue
				})
				await transactionEntityManager.save(newVote)

				post.points = post.points + inputVoteValue
				post = await transactionEntityManager.save(post)
			}

			return {
				code: 200,
				success: true,
				message: 'Post voted',
				post
			}
		})
	}

    @Query(_return=>PaginatedPosts,{nullable:true})
    async posts(
        @Arg('limit') limit:number,
        @Arg('cursor',{nullable:true}) cursor?:string,
    ):Promise<PaginatedPosts|null>{
        try {
            const realLimit=Math.min(10,limit);
            const findOptions:{[key:string]:any}={
                order:{
                    createdAt:'DESC'
                },
                take:realLimit,

            }
            let lastPost:Post[]=[];
            if(cursor){
                findOptions.where={
                    createdAt:LessThan(cursor)
                }
                lastPost=await Post.find({order:{createdAt:"ASC"},take:1});
            }
            const posts=await Post.find(findOptions);
            const count=await Post.count()
            console.log(count>realLimit)
            return{
                totalCount:count,
                cursor:posts[posts.length-1].createdAt,
                hasMore:count>realLimit?(cursor?posts[posts.length-1].createdAt.toString()!==lastPost[0].createdAt.toString():true):false,
                paginatedPosts:posts
            }
        } catch (error) {
            console.log(error)
             return  null
            
        }


    }

    @Query(_return=>Post,{nullable:true})
    async post(@Arg('id',_type=>ID) id:number):Promise<Post|undefined>{
        return await Post.findOne(id)
    }
}
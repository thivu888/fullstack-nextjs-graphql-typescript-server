import  argon2  from "argon2"
import { User } from "../entities/User"
import { Resolver, Mutation, Arg, Ctx,Query, Root, FieldResolver} from "type-graphql"
import { UserMutationResponse } from "../types/UserMutationResponse"
import { RegisterInput } from "../types/RegisterInput"
import { validateRegisterInput } from "../utils/validateRegisterInput"
import { LoginInput } from "../types/LoginInput"
import { COOKIE_NAME } from "../constants"
import { ForgotPasswordInput } from "../types/ForgotPasswordInput"
import { TokenModel } from "../models/Token"
import  {   v4 as uuidv4}  from 'uuid';
import { SendEmail } from "../utils/SendEmail"
import { ChangePasswordInput } from "../types/ChangePasswordInput"
import { Post } from "../entities/Post"

@Resolver(_of=>User)
export class UserResolver {

    @FieldResolver(_return=>[Post])
    async posts(
        @Root() root:User
    ){
        return await Post.find({userId:root.id})
    }

   @Mutation(_type=>UserMutationResponse)
    async register(
     @Arg("registerInput") registerInput:RegisterInput,
     @Ctx() context:any
     
    ):Promise<UserMutationResponse>{
    try {

        const validateRegisterInputErrors=validateRegisterInput(registerInput)
        if(validateRegisterInputErrors!=null)
            return{
                code:400,
                success:false,
               ...validateRegisterInputErrors
            }
            const{username,password,email}=registerInput
        const existingUser=await User.findOne({
            where:[{username},{email}]
        })
        if(existingUser){
            return {
                code:400,
                success:false,
                message:"Duplicate username or email"
            }
        }

        const hashPassword= await argon2.hash(password)
        const newUser=User.create({
            username,
            email,
            password:hashPassword
        })

        const newUserResponse =await User.save(newUser);
        context.req.session.userId=newUserResponse.id;

        return {
            code:200,
            success:true,
            message:"register successful",
            user:newUserResponse
        }

       } catch (error) {
           console.log(error);
           return {
            code:500,
            success:false,
            message:"server internal error"
            }

        }
        
   }

   @Mutation(_return=>UserMutationResponse)
   async login(
       @Arg('loginInput') loginInput:LoginInput,
        @Ctx() context:any
   ):Promise<UserMutationResponse>
   {    
        const {usernameOrEmail,password}=loginInput;

        const existingUser=
            await User.findOne(usernameOrEmail.includes('@')?{email:usernameOrEmail}:{username:usernameOrEmail})

        if(!existingUser)
        return{
            code:400,
            success:false,
            message:"user not found"
        }
        const passwordValid= await argon2.verify(existingUser.password,password)
        if(!passwordValid)
            return{
                code:400,
                success:false,
                message:"wrong password"
            }
        
        context.req.session.userId=existingUser.id;

        return {
            code:200,
            success:true,
            message:"login successfully",
            user:existingUser
        }
   }

   @Mutation(_return=>Boolean)
    logout(
       @Ctx() context:any
   ):Promise<Boolean>
   {
       return new Promise((resolve,_reject)=>{
           context.res.clearCookie(COOKIE_NAME)
           context.req.session.destroy((error:any)=>{
               if(error){
                   resolve(false)
               }
               resolve(true)
           })

       })
   }

   
	@Mutation(_return => Boolean)
	async forgotPassword(
		@Arg('forgotPasswordInput') forgotPasswordInput: ForgotPasswordInput
	): Promise<boolean> {
		const user = await User.findOne({ email: forgotPasswordInput.email })

		if (!user) return false

		// await TokenModel.findOneAndDelete({ userId: `${user.id}` })

		const resetToken = uuidv4()
		const hashedResetToken = await argon2.hash(resetToken)

		// save token to db
		await new TokenModel({
			userId: `${user.id}`,
			token: hashedResetToken
		}).save()
		// send reset pa    ssword link to user via email
		await SendEmail(
			forgotPasswordInput.email,
			`<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">Click here to reset your password</a>`
		)

		return true
	}

    @Mutation(_return => UserMutationResponse)
	async changePassword(
		@Arg('token') token: string,
		@Arg('userId') userId: string,
		@Arg('changePasswordInput') changePasswordInput: ChangePasswordInput,
		@Ctx() context: any
	): Promise<UserMutationResponse> {
		if (changePasswordInput.newPassword.length <= 2) {
			return {
				code: 400,
				success: false,
				message: 'Invalid password',
				errors: [
					{ field: 'newPassword', message: 'Length must be greater than 2' }
				]
			}
		}

		try {
			const resetPasswordTokenRecord = await TokenModel.findOne({ userId })

			if (!resetPasswordTokenRecord) {
				return {
					code: 400,
					success: false,
					message: 'Invalid or expired password reset token',
					errors: [
						{
							field: 'token',
							message: 'Invalid or expired password reset token'
						}
					]
				}
			}

			const resetPasswordTokenValid = argon2.verify(
				resetPasswordTokenRecord.token,
				token
			)
			if (!resetPasswordTokenValid) {
				return {
					code: 400,
					success: false,
					message: 'Invalid or expired password reset token',
					errors: [
						{
							field: 'token',
							message: 'Invalid or expired password reset token'
						}
					]
				}
			}

			const userIdNum = parseInt(userId)
			const user = await User.findOne(userIdNum)

			if (!user) {
				return {
					code: 400,
					success: false,
					message: 'User no longer exists',
					errors: [{ field: 'token', message: 'User no longer exists' }]
				}
			}

			const updatedPassword = await argon2.hash(changePasswordInput.newPassword)
			await User.update({ id: userIdNum }, { password: updatedPassword })

			await resetPasswordTokenRecord.deleteOne()

			context.req.session.userId = user.id

			return {
				code: 200,
				success: true,
				message: 'User password reset successfully',
				user
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`
			}
		}
	}

   @Query(_return=>User,{nullable:true})
   async me(
    @Ctx() context:any
   ):Promise<User |null|undefined>{
        if(!context.req.session.userId)return null;
        const user=await User.findOne(context.req.session.userId)
        return user;
   }
}
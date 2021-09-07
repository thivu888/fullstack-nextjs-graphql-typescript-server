import { RegisterInput } from "../types/RegisterInput"

export const validateRegisterInput=(registerInput: RegisterInput)=>{
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    const checkmail=re.test(registerInput.email)
    if(!checkmail)
        return {
            message:"invalid email",
            errors:[{field:"email",message:"must be an email"}]
        }
    if(registerInput.username.length<=3 || registerInput.username.includes('@')) 
        return {
            message:"invalid username",
            errors:[{field:"username",message:"lenght must be grater than 3"}]
        }
    if(registerInput.password.length<=5)
        return {
            message:"invalid password",
            errors:[{field:"password",message:"lenght must be grater than 5"}]
        }
    return null
}
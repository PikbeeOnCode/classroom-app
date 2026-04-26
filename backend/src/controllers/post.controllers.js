import db from "../db/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary,deleteImageFromCloudinary} from "../utils/Cloudinary.js";



const createPosts = asyncHandler(async (req, res) => {
    const user = req.user;
    const {title,content} = req.body;
   const imageLocalPath = req.file?.path
    

    if([title,content].some(field=>field?.trim()==="")){
        throw new apiError(400,"All fields are required");
    }
    console.log("imageLocalPath:", imageLocalPath)
    console.log("file:", req.file)
    const imageUrl = imageLocalPath ? (await uploadOnCloudinary(imageLocalPath))?.secure_url : null;
    console.log("imageUrl:", imageUrl)

    const newPost = await db.query("insert into posts (title,content,image,user_id) values($1,$2,$3,$4) returning *",[title,content,imageUrl,user.id])

    if(!newPost.rows[0]){
        throw new apiError(500,"Failed to create post");
    }

    return res.status(201).
    json(new apiResponse(201,{post: newPost.rows[0]},"Post created successfully"))
});


const getPostById  = asyncHandler(async(req,res)=>{
     const {postId}= req.params;
     if(!postId){
        throw new apiError(400,"user is not found");
     }

    const postFound = await db.query("select * from posts where id = $1",[postId]);
    
    if(postFound.rows.length === 0){
        throw new  apiError(404,"post not found of user");
    };

    return res.status(200).
    json( new apiResponse(200,{post:postFound.rows[0]},"post fetch sucessfully"));
});

const getAllPosts = asyncHandler(async(req,res)=>{
    const allPosts = await db.query(
        "select * from posts  order by created_at desc"
    );

    if(allPosts.rows.length===0){
        throw new apiError(404,"data is not found")
    };

    return res.status(200).
    json(new apiResponse(201,{post:allPosts.rows},"all post data is fetched") )
});


const updatePosts = asyncHandler(async(req,res)=>{
    const {postId} = req.params;
    const Id = req.user.id;
    const { title , content} = req.body;
    const imageLocalPath = req.file?.path;

    if(!postId){
        throw new apiError(404,"postid is required");
    };


    if(!Id){
        throw  new apiError(404,"user is not logged in ")
    };

    if (!(title || content)){
        throw new apiError(404,"enter atleast one data");
    };

    const oldpost = await db.query(" select * from posts where id = $1 ",[postId]);

    if(oldpost.rows.length === 0 ){
        throw new apiError(404,"no data is found ");
    };

    if(Id !== oldpost.rows[0].user_id){
        throw new apiError(403,"user is not authorized to update this post")
    }
     const oldImageUrl = oldpost.rows[0].image;
    const updatedTitle = title ? title : oldpost.rows[0].title;

    const updatedContent = content? content : oldpost.rows[0].content;

    const updatedImageUrl = async(imageLocalPath,oldImageUrl) =>{
        if(imageLocalPath){
            if(oldImageUrl){
                await deleteImageFromCloudinary(oldImageUrl);
            }

            const newImageUrl = await uploadOnCloudinary(imageLocalPath)
            return newImageUrl;
        }
        return oldImageUrl
    }

    const updateImage = await updatedImageUrl(imageLocalPath,oldImageUrl);

    const updatedPost = await db.query(" update posts set title = $1 , content = $2 ,image = $3  where id = $4 returning *",[updatedTitle,updatedContent,updateImage,postId]);

    if(updatedPost.rows.length == 0){
        throw new apiError(404,"failed to update post");
    };

    return res.status(200).
    json(new apiResponse(200,{posts:updatedPost.rows[0]},"data updated sucessfully"));
})

const deletePost = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await db.query(" select * from posts where id = $1 ",[postId])

    if(post.rows.length==0){
     throw new apiError(404,"data not found")
    }

    if(post.rows[0].user_id !== userId){
    throw new apiError(403, "not authorized to delete this post")
    ``}

   const postDeleteId = post.rows[0].id;

    const deletePost = await db.query("delete from  posts where id = $1 returning *",[postDeleteId])
   
    if(deletePost.rowCount == 0){
        throw new apiError(404,"failed to delete post");
    };

    return res.status(200).json(
        new apiResponse(
            200,
            {
                post:deletePost.rows[0]
            },
            "post delete sucessfully"
        )
    )

  });


export {
    createPosts,
    getPostById,
    getAllPosts,
    updatePosts,
    deletePost
}
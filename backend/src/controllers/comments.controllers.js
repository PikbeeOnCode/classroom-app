import db from "../db/db.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js";

const createComment = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const postId = req.params.postId;

    const {content} = req.body;

    if(!userId){
        throw new apiError(404,"user is not logged in ")
    };

    if(!postId){
        throw new apiError(404,"post id is required");
    };

    const checkPost = await db.query(" select * from posts where id = $1",[postId]);

    if(checkPost.rows.length == 0){
        throw new apiError(404,'post not found to comment')
    }

    if(!content){
        throw new apiError(404,"content is required to create post");
    }

    const createComment = await db.query(" insert into comments (content ,user_id,post_id) values ($1,$2,$3) returning * ",[
        content,userId,postId
    ]);

    if(createComment.rows.length == 0){
        throw new apiError(404,"failed to create comment try again ");
    };

    return res.status(201).
    json(new apiResponse(201,{
        comment:
            createComment.rows[0]
        
    },
    "comment created sucessfully"));

    });

    const replyToComment = asyncHandler(async(req,res)=>{
        const userId = req.user.id;
        const commentId = req.params.commentId;

        const content = req.body.content;

        if(!userId){
            throw new apiError(404,"user is not logged in ");
        }

        if(!commentId){
            throw new apiError(404,"comment id is required  "
            )
        }

        if(!content){
            throw new apiError(404,"content is required ");
        }

        const checkParentComment = await db.query("select * from comments where id = $1",[commentId]);

        if(checkParentComment.rows.length==0){
            throw new apiError(404,"comment is not found ");
        }

        const postId = checkParentComment.rows[0].post_id;

        const insertComment = await db.query("insert into comments (content,user_id,post_id,parent_id) values($1,$2,$3,$4) returning * ",[
            content,
            userId,
            postId,
            commentId
        ])

        if(insertComment.rows.length == 0){
            throw new apiError(404,"failed to reply comment");
        }

        return res.status(200).
        json(
            new apiResponse(
                200,
                {
                    comment : insertComment.rows[0]
                },"comment replied sucessfully"
            )
        )


    });

    const deletecomment = asyncHandler(async(req,res)=>{
        const userId = req.user.id;

        const commentId = req.params.commentId;

        if(! userId){
            throw new apiError(404," user needs to login first");
        };

        if(!commentId){
            throw new apiError(404,"comment id is required ")
        };

        const checkComment = await db.query(" select * from comments where id = $1",[commentId]);

        if(checkComment.rows.length == 0){
            throw new apiError(404,"comment not found ")
        }

        if(userId !== checkComment.rows[0].user_id){
            throw new apiError(403,"unauthorized user");
        };

        const deletecomment = await db.query("delete from comments where id = $1",[
            commentId
        ]);

        if(deletecomment.rowCount == 0){
            throw new apiError(404,"failed to delete comment")
        }

        return res.status(200).
        json(
            new apiResponse(
                200,
                {
                   
                },
                "deleted commnent sucessfully"
            )
        )
    });
export {
    createComment,
    replyToComment,
    deletecomment
}
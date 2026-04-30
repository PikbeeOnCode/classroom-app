import db from "../db/db.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js";


const togglePostLike = asyncHandler(async(req,res)=>{
    const  userId = req.user.id;

    const postId = req.params.postId;

    if(!userId){
        throw new apiError(400,"user id is required");
    }

    if(!postId){
        throw new apiError(400,"post id is required ");
    }
    
    const postCheck = await db.query("select * from posts where id = $1",[
        postId
    ]);

    if(postCheck.rows.length == 0 ){
        throw new apiError(404," post is not  found");
    }

    const checkLike = await db.query("select * from  post_likes where user_id = $1 and post_id = $2 ",[
        userId,
        postId
    ]);


    let liked ;

    if(checkLike.rows.length == 0){
        const like = await db.query("insert into post_likes (user_id,post_id) values($1,$2)",
            [
                userId,
                postId
            ]
        )
        liked = true
    }else{
        const dislike = await db.query("delete from post_likes where post_id = $1 and user_id = $2",[
            postId,
            userId
        ])
        liked = false
    }

    const countResult = await db.query(
        "SELECT COUNT(*) FROM post_likes WHERE post_id = $1",
        [postId]
    );
    const likeCount = parseInt(countResult.rows[0].count);

    return res.status(200).json(
        new apiResponse(
            200,
            {
                like:liked,
                likeCount
            },
            liked ? " post liked " : "post disliked"
        )
    )
});

const toggleCommentLike = asyncHandler(async(req,res)=>{
    const userId = req.user.id;

    const commentId = req.params.commentId;

    if(!userId){
        throw new apiError(400,"user id is required");
    }

    if(!commentId){
        throw new apiError(400,"comment id is required ")
    }

    const checkComment = await db.query(" select 1 from  comments where id = $1",[
        commentId
    ])

    if(checkComment.rows.length == 0){
        throw new apiError(400,"comment not found ")
    }

    const checkLike = await db.query("select * from comment_likes where user_id = $1 and comment_id = $2 ",[
        userId,
        commentId
      ])

      let liked ;
      if(checkLike.rows.length==0){
        const like = await db.query("insert into comment_likes (user_id,comment_id) values($1,$2)",[
            userId,
            commentId
        ]);
        liked = true
      }else {
        const dislike = await db.query("delete from comment_likes where user_id = $1 and comment_id = $2",[
            userId,
            commentId
        ])
        liked = false;
      }

   const countResult = await db.query(
        "SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1",
        [commentId]
    );
    const likeCount = parseInt(countResult.rows[0].count);

    return res.status(200).json(
        new apiResponse(
            200,
            {
                like:liked,
                likeCount
            },
            liked ? " comment liked " : "comment disliked"
        )
    )

})

export {
    togglePostLike,
    toggleCommentLike
}
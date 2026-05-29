import db from "../db/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const createQuiz = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const classroomId = req.params.classroomId;
    const {title} = req.body;

    if(!userId){
        throw new apiError(403,"user id is required ");
    }

    if(!classroomId){
        throw new apiError(403,"classroom id is required");
    }

    if(!title){
        throw new apiError(403,"title is required ")
    }

    const classroom = await db.query(`select * from  classrooms where id = $1 `,
        [
            classroomId
        ]
    );

    if(classroom.rows.length === 0){
        throw new apiError(404,"the classroom from given classroom is not there please try again ")
    }


    const userData = await db.query("select * from users where  id = $1 ",[
        userId
    ])

    if(userData.rows.length == 0){
        throw new apiError(404,"user data not found ");
    }


    if(userData.rows[0].role.toLowerCase() !== 'teacher'){
        throw new apiError(403,"user is  aunthorized to create quiz in this classroom ")
    }

    const membership = await db.query("select * from  classroom_members where classroom_id = $1 and user_id = $2",
        [
            classroomId,
            userId
        ]
    )
    
    if(!membership.rows.length){
        throw new apiError(403,"user is unauthorized to create quiz in this classroom ");
    }

    const quiz = await db.query(` insert into quizzes (title , classroom_id ,created_by) values($1,$2,$3) returning *`,[
        title,
        classroomId,
        userId
    ])

    if(quiz.rowCount == 0){
        throw new apiError(404,`failed to create ${title}`)
    }

    return res.status(201).json(
        new apiResponse(201,
            {
                quiz:quiz.rows[0]
            },
            `sucesfully created ${title}`
        )
    )

});

const addQuestion = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const quizId = req.params.quizId;

    const {question,options,correctAnswer} = req.body;
    
    if(!quizId){
        throw new apiError(403,"quiz id is required ");
    };

    if([question, correctAnswer].some(field => field?.trim() === "")){
    throw new apiError(400, "All fields are required")
    }

   if(!options || options.length < 4){
  throw new apiError(400, "At least 2 options are required")
}

    const quiz = await db.query(` select * from quizzes where id = $1`,[quizId]);

    if(quiz.rows.length == 0){
        throw new apiError(403,"the quiz from given id is not found ")
    }

    if(quiz.rows[0].created_by !== userId){
        throw new apiError(403,"user doesn't have permission to add question ")
    }

    



    const insertQuestion = await db.query(` insert into questions (question,options,correct_answer,quiz_id) values($1,$2,$3,$4) returning * `,
        [
            question,
            JSON.stringify(options),
            correctAnswer,
            quizId
        ]
    )

    if(insertQuestion.rows.length == 0){
        throw new apiError(404,"failed to insert question");
    };

    return res.status(201).json(
        new apiResponse(
            201,
            {
                quizz:insertQuestion.rows[0]
            },
            "question inserted sucessfully "
        )
    )

});

const publishQuiz = asyncHandler(async(req,res)=>{
    const userId = req.user.id;

    const quizId = req.params.quizId;

  const {timeLimit,passingScore,totalQuestions } = req.body;

  if(!userId){
    throw new apiError(400," user id is required ")
  };

    if(!quizId){
    throw new apiError(404, `quiz not found from given id`);
  };

  const allFields = [timeLimit,passingScore,totalQuestions].every(field => field !== undefined);


  if(!allFields){
    throw new apiError(404,"all the data fields are required to fill , please try again ");
  };

  const quiz = await db.query(`select * from quizzes where id = $1`,[
    quizId
  ]);
  
  if(quiz.rows.length === 0){
    throw new apiError(404,` quiz not found from given id `);
  };

  if(Number(userId) !== Number(quiz.rows[0].created_by)){
    throw new apiError(403,' the user do not have permission to publish question ')
  };

  if(quiz.rows[0].is_published === true){
  throw new apiError(400, "quiz is already published!")
}

const totalQuestionInDb = await db.query('select count(*) from questions where quiz_id = $1',[quizId]);

const availableQuestionInDb = Number(totalQuestionInDb.rows[0].count);

if(availableQuestionInDb < totalQuestions ){
    throw new apiError(400,' not enough question in quizes ')
};

const updateQuizData = await db.query(`
     update quizzes set 
    is_published = true,
    time_limit = $1,
    passing_score = $2,
    total_questions = $3
    where id = $4
     returning *
    `,[
        timeLimit,
        passingScore,
        totalQuestions,
        quizId
    ]);

    return res.status(200).json(new apiResponse(
        200,
        {
            quiz:updateQuizData.rows[0]
        },
        "question published successfully"
    ))
});



export {
    createQuiz,
    addQuestion,
    publishQuiz
}
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



const getQuiz = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const quizId = req.params.quizId ;

    const existingQuiz = await db.query(` select * from quizzes where id = $1 `,[
        quizId
    ]);

    if(existingQuiz.rows.length === 0){
        throw new apiError(404,"the quiz data from given id is not found ");
    }

if(!existingQuiz.rows[0].is_published){
    throw new apiError(403,"the quiz is not published yet try again ");
}

const classroomMembers = await db.query('select * from classroom_members where classroom_id = $1',
    [
        existingQuiz.rows[0].classroom_id,
    ])

const isMember = classroomMembers.rows.some(
  member => Number(member.user_id) === Number(userId)
);

if (!isMember) {
  throw new apiError(403, "User is not a classroom member");
};

const hasAlreadySumbitted = await db.query('select * from quiz_results where quiz_id = $1 and student_id = $2',
    [
        quizId,
        userId
    ]
);

const alreadySumbitted = hasAlreadySumbitted.rows.length > 0 ;

if(alreadySumbitted){
    throw new apiError(409,"the user have already attempted the quiz ");
};

const existingAttempt = await db.query('select  * from quiz_attempts where student_id = $1 and quiz_id = $2',[
    userId,
    quizId
]);


if(existingAttempt.rows.length > 0){
        // return same questions as before!
        const savedQuestionIds = existingAttempt.rows[0].question_ids
        const sameQuestions = await db.query(
            "SELECT id, question, options FROM questions WHERE id = ANY($1::int[])",
            [savedQuestionIds]
        );

        const orderedQuestions = savedQuestionIds.map(id =>
    sameQuestions.rows.find(q => q.id === id)
        );
        return res.status(200).json(
            new apiResponse(200, {
                quiz: existingQuiz.rows[0],
                questions: orderedQuestions
            }, "questions fetched successfully")
        )
    }

const questions = await db.query(` 
    select id,question,options from questions 
    where quiz_id = $1 
    order by random()
    limit $2
    `,[
        quizId,
        existingQuiz.rows[0].total_questions
    ])

const getQuestions = questions.rows.length > 0;

if(!getQuestions){
    throw new apiError(404,"question not available , try again ")
};

const selectedQuestions = questions.rows;

const questionIds = selectedQuestions.map(q => q.id)
await db.query(
  "INSERT INTO quiz_attempts (student_id, quiz_id, question_ids) VALUES ($1, $2, $3)",
  [userId, quizId, JSON.stringify(questionIds)]
)
return res.status(201).json(
    new apiResponse(201,
        { 
            quiz: existingQuiz.rows[0],
            questions: questions.rows  
        },
        "question fetched sucessfully"
    )
)

});

const submitQuiz = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const quizId = req.params.quizId;
    const answers = req.body.answers;

    if (!userId) {
        throw new apiError(403, "User id is required");
    }

    if (!quizId) {
        throw new apiError(403, "Quiz id is required");
    }

    if (req.user.role !== "student") {
        throw new apiError(403, "Only students can submit quiz");
    }

    if (!Array.isArray(answers) || answers.length === 0) {
        throw new apiError(400, "Answers are required");
    }

    const hasValidAnswers = answers.every(
        answer =>
            answer.questionId !== undefined &&
            answer.selectedAnswer !== undefined
    );

    if (!hasValidAnswers) {
        throw new apiError(
            400,
            "All answers must include questionId and selectedAnswer"
        );
    }

    const existingAttempt = await db.query(
        `
        SELECT *
        FROM quiz_attempts
        WHERE student_id = $1
        AND quiz_id = $2
        `,
        [userId, quizId]
    );

    if (existingAttempt.rows.length === 0) {
        throw new apiError(404, "Quiz attempt not found");
    }

    const quizAttempt = existingAttempt.rows[0];

    if (quizAttempt.is_submitted) {
        throw new apiError(409, "Quiz already submitted");
    }

    const questionIds = quizAttempt.question_ids;

    const assignedQuestions = await db.query(
        `
        SELECT id, correct_answer
        FROM questions
        WHERE id = ANY($1)
        `,
        [questionIds]
    );

    const answerMap = new Map();

    assignedQuestions.rows.forEach(question => {
        answerMap.set(question.id, question.correct_answer);
    });

    let correctAnswerCount = 0;

    answers.forEach(answer => {
        const correctAnswer = answerMap.get(answer.questionId);

        if (answer.selectedAnswer === correctAnswer) {
            correctAnswerCount++;
        }
    });

    const quiz = await db.query(
        `
        SELECT *
        FROM quizzes
        WHERE id = $1
        `,
        [quizId]
    );

    if (quiz.rows.length === 0) {
        throw new apiError(404, "Quiz not found");
    }

    const totalQuestions = quiz.rows[0].total_questions;

    const scorePercentage =
        (correctAnswerCount / totalQuestions) * 100;

    const isPassed =
        scorePercentage >= quiz.rows[0].passing_score;

    const quizResult = await db.query(
        `
        INSERT INTO quiz_results
        (
            student_id,
            quiz_id,
            score,
            total
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
            userId,
            quizId,
            scorePercentage,
            totalQuestions
        ]
    );

    if (quizResult.rows.length === 0) {
        throw new apiError(500, "Failed to save quiz result");
    }

    const updatedAttempt = await db.query(
        `
        UPDATE quiz_attempts
        SET is_submitted = true
        WHERE student_id = $1
        AND quiz_id = $2
        RETURNING *
        `,
        [userId, quizId]
    );

    if (updatedAttempt.rows.length === 0) {
        throw new apiError(500, "Failed to update quiz attempt");
    }

    return res.status(200).json(
        new apiResponse(
            200,
            {
                score: correctAnswerCount,
                total: totalQuestions,
                percentage: scorePercentage,
                passed: isPassed
            },
            "Quiz submitted successfully"
        )
    );
});

const getResult = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const quizId = req.parans.quizId;


    if(!userId){
        throw new apiError(404,"user id  is required ")
    };

    if(!quizId){
        throw new apiError(404,"quiz id is required from params ")
    };

    
})





export {
    createQuiz,
    addQuestion,
    publishQuiz,
    getQuiz,
    submitQuiz
}
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const interviewSessionRoutes = require("./routes/interviewSession.routes.js");
const codingRoutes = require("./routes/coding.routes.js");

const app = express();

app.use(express.json({ type: 'application/json' }));
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin === process.env.FRONTEND_URL) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}));

const authRouter = require('./routes/auth.routes');
const interviewRouter = require('./routes/interview.routes');

app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter)
app.use("/api/interview-session", interviewSessionRoutes);
app.use("/api/coding", codingRoutes);


module.exports = app;
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import createError from 'http-errors';
import dotenv from 'dotenv';

import indexRouter from './routes/index';
import usersRouter from './routes/users';

import path from 'path';

dotenv.config();

const app = express();

app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');
;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + '/../public'));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

export default app;

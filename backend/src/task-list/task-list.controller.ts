import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';
import { TaskListService } from './task-list.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@Controller('task-list')
@UseGuards(AuthGuard('jwt'))
export class TaskListController {
  constructor(private readonly taskListService: TaskListService) {}

  @Post()
  create(@Body() createTaskListDto: CreateTaskListDto, @GetUser() user: AuthenticatedUserDto) {
    return this.taskListService.create(createTaskListDto, user.id);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUserDto) {
    return this.taskListService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUserDto) {
    return this.taskListService.findOne(+id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskListDto: UpdateTaskListDto, @GetUser() user: AuthenticatedUserDto) {
    return this.taskListService.update(+id, updateTaskListDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedUserDto) {
    return this.taskListService.remove(+id, user.id);
  }
}

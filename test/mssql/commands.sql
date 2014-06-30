-- ^^DAL_SPECS_UP

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND  TABLE_NAME = 'Fruits'
)
BEGIN
  drop table Fruits;
END;
GO

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND  TABLE_NAME = 'Animals'
)
BEGIN
  drop table Animals;
END;
GO

create table Fruits (id int identity(1000, 1) primary key, name varchar(255) null, description varchar(244) null);
set identity_insert Fruits on
insert into Fruits (id, name, description)
values
  (1, 'apple', 'green, red, ...'), (2, 'orange', 'orange');
set identity_insert Fruits off
GO


create table Animals (id int identity(1000, 1) primary key, name varchar(255) null, description varchar(244) null);
set identity_insert Animals on
insert into Animals (id, name, description)
values
  (1, 'dog', 'needy'), (2, 'cat', 'independent');
set identity_insert Animals off
GO



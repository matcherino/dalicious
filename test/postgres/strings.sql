-- ^^DAL_SPECS_UP
drop table if exists Fruits;
drop table if exists Animals;
drop table if exists Users;

create table Fruits (id serial primary key, name varchar(255) null, description varchar(244) null);
insert into Fruits (id, name, description)
values
  (1, 'apple', 'green, red, ...'), (2, 'orange', 'orange');

ALTER SEQUENCE fruits_id_seq RESTART WITH 105;


create table Animals (id serial primary key, name varchar(255) null, description varchar(244) null);
insert into Animals (id, name, description)
values
  (1, 'dog', 'needy'), (2, 'cat', 'independent');

ALTER SEQUENCE animals_id_seq RESTART WITH 105;

create table Users (
  id serial primary key,
  name varchar(255)
);

insert into Users (id, name)
values
  (1, 'foo'), (2, 'bar');


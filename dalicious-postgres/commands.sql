-- ^^getTableColumns
select column_name, is_nullable, data_type, character_maximum_length, column_default
from information_schema.columns
where table_catalog = $1 and table_name = $2;

-- ^^getTablePrimaryKey
select column_name
from information_schema.table_constraints TC
inner join information_schema.key_column_usage KCU on TC.constraint_name = KCU.constraint_name
where constraint_type = 'PRIMARY KEY' and TC.table_catalog = $1 and TC.table_name = $2;


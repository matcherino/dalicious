-- ^^getPrimaryKeys
SELECT K.TABLE_NAME, K.COLUMN_NAME, K.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS C
  JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K ON C.TABLE_NAME = K.TABLE_NAME
  AND C.CONSTRAINT_CATALOG = K.CONSTRAINT_CATALOG
  AND C.CONSTRAINT_SCHEMA = K.CONSTRAINT_SCHEMA
  AND C.CONSTRAINT_NAME = K.CONSTRAINT_NAME
WHERE C.CONSTRAINT_TYPE = 'PRIMARY KEY';

-- ^^getColumns
SELECT table_catalog, table_schema, table_name, column_name, ordinal_position, is_nullable, data_type, character_maximum_length
FROM INFORMATION_SCHEMA.COLUMNS
WHERE table_name = @table;

-- ^^schema
SELECT table_catalog, table_schema, table_name, column_name, ordinal_position, is_nullable, data_type, character_maximum_length
FROM INFORMATION_SCHEMA.COLUMNS;



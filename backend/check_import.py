import os
import database
import main
print('engine', database.engine)
print('tables', database.inspect(database.engine).get_table_names())


exports.up = function(knex, Promise) {
  return knex.schema.createTable('files', function(table) {
        /* t.increments('id').unsigned().primary();
        t.dateTime('createdAt').notNull();
        t.dateTime('updatedAt').nullable();
        t.dateTime('deletedAt').nullable();

        t.string('name').notNull();
        t.text('decription').nullable();
        t.decimal('price', 6, 2).notNull();
        t.enum('category', ['apparel', 'electronics', 'furniture']).notNull(); */

		table.increments('id').unsigned().primary();
		table.string('file_id').unique();
		table.string('title').nullable().collate('utf8_unicode_ci');
		table.bigInteger('size').nullable().defaultTo(0);
		table.string('mime').nullable();
		table.string('type').nullable();
		table.string('slug').nullable();
		table.string('name').nullable();
		table.string('fileId').nullable();
		table.boolean('downloaded').defaultTo(0);
		table.boolean('uploaded').defaultTo(0);
		table.boolean('status').nullable();
		table.text('description').nullable().collate('utf8_unicode_ci');
	});
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('files');
};

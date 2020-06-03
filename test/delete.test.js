'use strict';

var testHelpers = require('./test_helpers');

describe('record deletion', function() {
    var airtable;
    var testExpressApp;
    var teardownAsync;

    beforeEach(function() {
        return testHelpers.getMockEnvironmentAsync().then(function(env) {
            airtable = env.airtable;
            testExpressApp = env.testExpressApp;
            teardownAsync = env.teardownAsync;
        });
    });

    afterEach(function() {
        return teardownAsync();
    });

    it('can delete one record', function() {
        return airtable
            .base('app123')
            .table('Table')
            .destroy('rec123')
            .then(function(deletedRecord) {
                expect(deletedRecord.id).toBe('rec123');
            });
    });

    it('can delete one record and call a callback', function(done) {
        airtable
            .base('app123')
            .table('Table')
            .destroy('rec123', function(err, deletedRecord) {
                expect(err).toBeNull();
                expect(deletedRecord.id).toBe('rec123');
                done();
            });
    });

    it('can delete multiple records', function() {
        return airtable
            .base('app123')
            .table('Table')
            .destroy(['rec123', 'rec456'])
            .then(function(deletedRecords) {
                expect(deletedRecords).toHaveLength(2);
                expect(deletedRecords[0].id).toBe('rec123');
                expect(deletedRecords[1].id).toBe('rec456');
            });
    });

    it('can throw an error if delete fails', function(done) {
        testExpressApp.set('handler override', function(req, res) {
            res.status(402).json({
                error: {message: 'foo bar'},
            });
        });

        return airtable
            .base('app123')
            .table('Table')
            .destroy(['rec123', 'rec456'])
            .catch(function(err) {
                expect(err).not.toBeNull();
                done();
            });
    });

    it('can delete multiple records and call a callback', function(done) {
        airtable
            .base('app123')
            .table('Table')
            .destroy(['rec123', 'rec456'], function(err, deletedRecords) {
                expect(err).toBeNull();
                expect(deletedRecords).toHaveLength(2);
                expect(deletedRecords).toHaveLength(2);
                expect(deletedRecords[0].id).toBe('rec123');
                expect(deletedRecords[1].id).toBe('rec456');
                done();
            });
    });
});

--Remove all contcts
DELETE FROM Contacts;


--Add the relationship between test1 and test2
INSERT INTO 
    Contacts(memberid_a, memberid_b, verified)
VALUES
    ((SELECT MemberID from Members WHERE Email='test1@test.com'), 
    (SELECT MemberID from Members WHERE Email='test2@test.com'), 1);


--Add the relationship between test1 and test3
INSERT INTO 
    Contacts(memberid_a, memberid_b, verified)
VALUES
    ((SELECT MemberID from Members WHERE Email='test1@test.com'), 
    (SELECT MemberID from Members WHERE Email='test3@test.com'), 1);

--Add the relationship between test2 and test3
INSERT INTO 
    Contacts(memberid_a, memberid_b, verified)
VALUES
    ((SELECT MemberID from Members WHERE Email='test2@test.com'), 
    (SELECT MemberID from Members WHERE Email='test3@test.com'), 1);
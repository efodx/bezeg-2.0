import {Card, CardBody, CardTitle, ListGroup} from "react-bootstrap";
import React from "react";

/** `revision` changes when the scene was replaced, so uncontrolled controls re-seed from the new scene. */
export function Commands(props: { commands: JSX.Element[], title: String, revision?: number }) {
    return <Card className={'tools'}>
        <CardBody>
            <CardTitle>{props.title}</CardTitle>
            <ListGroup variant="flush">
                {props.commands.map((command, index) => <ListGroup.Item key={`${props.revision ?? 0}-${index}`}>{command}</ListGroup.Item>)}
            </ListGroup>
        </CardBody>
    </Card>;
}

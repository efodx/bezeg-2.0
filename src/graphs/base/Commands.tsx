import {Card, ListGroup} from "react-bootstrap";
import {ToolSection} from "../../inputs/ToolSection";
import React from "react";

/** A titled list of controls. The controls are controlled, so a replaced scene needs no remounting. */
export function Commands(props: { commands: JSX.Element[], title: String }) {
    return <Card className={'tools'}>
        <ToolSection id={`commands-${props.title}`} title={props.title} element="div" className="card-body" headingElement="div" headingClassName="card-title h5">
            <ListGroup variant="flush">
                {props.commands.map((command, index) => <ListGroup.Item key={index}>{command}</ListGroup.Item>)}
            </ListGroup>
        </ToolSection>
    </Card>;
}
